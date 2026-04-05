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
