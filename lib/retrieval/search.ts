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
    typeFilter: ['document', 'project_material'],
    limit: params.limit,
  })
}
