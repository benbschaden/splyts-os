import { createUntypedServiceClient } from '@/lib/supabase/service'
import { embedText } from '@/lib/retrieval/embed'
import { CONTENT_REGISTRY } from './content-registry'

/**
 * Index a content item for semantic search.
 * Derives title + summary from the row, generates an embedding, and upserts into content_index.
 * Safe to call on create or update — uses upsert on (content_type, content_id).
 *
 * This function is designed to be called fire-and-forget from API routes:
 *   indexContent('output', savedRow, orgId).catch(err => console.error('[content-index]', err))
 */
export async function indexContent(
  contentType: string,
  row: unknown,
  organizationId: string,
): Promise<void> {
  const data = row as Record<string, unknown>
  const config = CONTENT_REGISTRY[contentType]
  if (!config) {
    console.warn(`[content-index] Unknown content type: ${contentType}`)
    return
  }

  const contentId = data.id as string | undefined
  if (!contentId) {
    console.warn(`[content-index] Row missing id for type: ${contentType}`)
    return
  }

  if (!process.env.OPENAI_API_KEY) {
    return
  }

  const { title, summary } = config.deriveText(data)
  const textToEmbed = `${title} — ${summary}`.trim()

  if (!textToEmbed || textToEmbed === '—') {
    return
  }

  let embedding: number[]
  try {
    embedding = await embedText(textToEmbed)
  } catch (err) {
    console.error(`[content-index] Embedding failed for ${contentType}/${contentId}:`, err)
    return
  }

  const metadata = config.deriveMetadata?.(data) ?? {}
  const embeddingStr = `[${embedding.join(',')}]`

  const supabase = createUntypedServiceClient()
  const { error } = await supabase.from('content_index').upsert(
    {
      organization_id: organizationId,
      content_type: contentType,
      content_id: contentId,
      title,
      summary,
      embedding: embeddingStr as unknown as string,
      metadata,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'content_type,content_id' },
  )

  if (error) {
    console.error(`[content-index] Upsert failed for ${contentType}/${contentId}:`, error.message)
  }
}

/**
 * Remove a content item from the index.
 * Call when content is deleted (including soft deletes).
 */
export async function removeFromIndex(
  contentType: string,
  contentId: string,
): Promise<void> {
  const supabase = createUntypedServiceClient()
  const { error } = await supabase
    .from('content_index')
    .delete()
    .eq('content_type', contentType)
    .eq('content_id', contentId)

  if (error) {
    console.error(`[content-index] Delete failed for ${contentType}/${contentId}:`, error.message)
  }
}
