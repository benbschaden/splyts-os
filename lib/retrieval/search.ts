import { createServiceClient } from '@/lib/supabase/service'
import { embedText } from './embed'

export type RetrievedContext = {
  type: 'document' | 'material'
  id: string
  title: string | null
  summary: string
  visibility: string
  projectId?: string
  relevanceScore: number
}

export async function retrieveRelevantDocuments(params: {
  query: string
  organizationId: string
  userId: string
  projectId?: string
  limit?: number
}): Promise<RetrievedContext[]> {
  const { query, organizationId, userId, projectId, limit = 5 } = params

  // If OpenAI is not configured, return empty — retrieval is optional infrastructure
  if (!process.env.OPENAI_API_KEY) {
    return []
  }

  let queryEmbedding: number[]
  try {
    queryEmbedding = await embedText(query)
  } catch {
    // Embedding failed — return empty rather than crashing the request
    return []
  }

  const supabase = createServiceClient()

  const docLimit = projectId ? Math.ceil(limit * 0.6) : limit
  const matLimit = projectId ? Math.floor(limit * 0.4) : 0

  const results: RetrievedContext[] = []

  // Document search
  const { data: docResults, error: docError } = await supabase.rpc(
    'search_documents_by_embedding',
    {
      query_embedding: queryEmbedding,
      org_id: organizationId,
      searching_user_id: userId,
      result_limit: docLimit,
    },
  )

  if (!docError && docResults) {
    for (const row of docResults) {
      results.push({
        type: 'document',
        id: row.document_id,
        title: row.title ?? null,
        summary: row.summary ?? '',
        visibility: row.visibility,
        relevanceScore: applyQualityWeight(row.similarity, row.visibility),
      })
    }
  }

  // Material search (only if project context is available)
  if (projectId && matLimit > 0) {
    const { data: matResults, error: matError } = await supabase.rpc(
      'search_materials_by_embedding',
      {
        query_embedding: queryEmbedding,
        org_id: organizationId,
        project_id_filter: projectId,
        result_limit: matLimit,
      },
    )

    if (!matError && matResults) {
      for (const row of matResults) {
        results.push({
          type: 'material',
          id: row.material_id,
          title: row.title ?? null,
          summary: row.content_preview ?? '',
          visibility: 'project',
          projectId: row.mat_project_id,
          relevanceScore: row.similarity * 1.1, // Slight boost for same-project materials
        })
      }
    }
  }

  // Sort by weighted relevance score, highest first
  results.sort((a, b) => b.relevanceScore - a.relevanceScore)

  return results.slice(0, limit)
}

function applyQualityWeight(similarity: number, visibility: string): number {
  // Filed documents are canonical truth — weight them higher
  if (visibility === 'filed') return similarity * 1.2
  // Shared documents are team-approved — slight boost
  if (visibility === 'shared') return similarity * 1.05
  // Private documents — no boost
  return similarity
}
