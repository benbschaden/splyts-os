import { createUntypedServiceClient } from '@/lib/supabase/service'
import { embedText } from './embed'

export type RetrievedContext = {
  type: string
  id: string
  title: string | null
  summary: string
  metadata: Record<string, unknown>
  relevanceScore: number
}

export async function retrieveRelevantContext(params: {
  query: string
  organizationId: string
  typeFilter?: string[]
  limit?: number
}): Promise<RetrievedContext[]> {
  const { query, organizationId, typeFilter, limit = 10 } = params

  if (!process.env.OPENAI_API_KEY) {
    return []
  }

  let queryEmbedding: number[]
  try {
    queryEmbedding = await embedText(query)
  } catch {
    return []
  }

  const supabase = createUntypedServiceClient()

  const { data, error } = await supabase.rpc('search_content_index', {
    query_embedding: queryEmbedding,
    org_id: organizationId,
    result_limit: limit,
    type_filter: typeFilter ?? null,
  })

  if (error || !data) return []

  return data.map((row: {
    content_type: string
    content_id: string
    title: string
    summary: string
    metadata: Record<string, unknown>
    similarity: number
  }) => ({
    type: row.content_type,
    id: row.content_id,
    title: row.title || null,
    summary: row.summary,
    metadata: row.metadata ?? {},
    relevanceScore: row.similarity,
  }))
}

/**
 * @deprecated Use retrieveRelevantContext instead. Kept temporarily for backward compatibility.
 */
export async function retrieveRelevantDocuments(params: {
  query: string
  organizationId: string
  userId: string
  projectId?: string
  limit?: number
}): Promise<RetrievedContext[]> {
  return retrieveRelevantContext({
    query: params.query,
    organizationId: params.organizationId,
    typeFilter: ['document', 'project_material', 'project_material_chunk'],
    limit: params.limit ?? 15,
  })
}

/**
 * Fetch all chunks for a specific material in chunk_index order and return
 * the full reconstructed text. Used for single-material deep-dive analysis.
 * Returns empty string if the material has no chunks or the fetch fails.
 */
export async function fetchAllMaterialChunks(
  materialId: string,
  organizationId: string,
): Promise<string> {
  const supabase = createUntypedServiceClient()

  const { data, error } = await supabase.rpc('fetch_material_chunks', {
    p_material_id: materialId,
    p_org_id: organizationId,
  })

  if (error || !data || data.length === 0) return ''

  return (data as Array<{ chunk_index: number; chunk_content: string }>)
    .sort((a, b) => a.chunk_index - b.chunk_index)
    .map((row) => row.chunk_content)
    .join(' ')
}

export type ProjectMaterialForFullTextFetch = {
  id: string
  material_type: 'note' | 'file' | 'link'
  title: string | null
  content: string | null
  file_name: string | null
}

/**
 * Full text for project materials in sort order (matches project materials list).
 * Includes note bodies from `content` and file bodies from the chunk index.
 * Total character budget is shared across all items (default 100k) to cap prompt size.
 */
export async function fetchFullTextsForProjectMaterials(
  materials: ProjectMaterialForFullTextFetch[],
  organizationId: string,
  maxChars = 100_000,
): Promise<Array<{ title: string; content: string }>> {
  if (materials.length === 0) return []

  const fileRows = materials.filter((m) => m.material_type === 'file')
  const chunkTexts =
    fileRows.length > 0
      ? await Promise.all(fileRows.map((m) => fetchAllMaterialChunks(m.id, organizationId)))
      : []
  const fileTextById = new Map<string, string>()
  fileRows.forEach((m, i) => {
    const t = chunkTexts[i]
    if (t) fileTextById.set(m.id, t)
  })

  const result: Array<{ title: string; content: string }> = []
  let totalChars = 0

  for (const m of materials) {
    if (totalChars >= maxChars) break
    const remaining = maxChars - totalChars
    if (remaining <= 0) break

    if (m.material_type === 'link') continue

    if (m.material_type === 'note') {
      const body = m.content?.trim()
      if (!body) continue
      const trimmed = body.slice(0, remaining)
      const title = m.title?.trim() || 'Note'
      result.push({ title, content: trimmed })
      totalChars += trimmed.length
      continue
    }

    if (m.material_type === 'file') {
      const text = fileTextById.get(m.id)
      if (!text) continue
      const trimmed = text.slice(0, remaining)
      const title = m.title?.trim() || m.file_name?.trim() || 'Uploaded file'
      result.push({ title, content: trimmed })
      totalChars += trimmed.length
    }
  }

  return result
}

/**
 * Fetch full reconstructed text for multiple file materials in parallel.
 * Returns array of {title, content} for materials that have chunks.
 * Total content is capped at maxChars to avoid blowing the token budget.
 */
export async function fetchFullTextsForMaterials(
  materials: Array<{ id: string; title: string | null; file_name: string | null }>,
  organizationId: string,
  maxChars = 100_000,
): Promise<Array<{ title: string; content: string }>> {
  if (materials.length === 0) return []
  return fetchFullTextsForProjectMaterials(
    materials.map((m) => ({
      id: m.id,
      material_type: 'file' as const,
      title: m.title,
      content: null,
      file_name: m.file_name,
    })),
    organizationId,
    maxChars,
  )
}
