import { createUntypedServiceClient } from '@/lib/supabase/service'
import { embedText } from '@/lib/retrieval/embed'

const CHUNK_SIZE = 1000
const CHUNK_OVERLAP = 150
// Materials shorter than this are handled by the standard single-row indexContent path
const MIN_CONTENT_FOR_CHUNKING = 200

/**
 * Split text into overlapping chunks of a fixed size.
 * Exported for unit testing.
 */
export function chunkText(
  text: string,
  chunkSize = CHUNK_SIZE,
  overlap = CHUNK_OVERLAP,
): string[] {
  const chunks: string[] = []
  let start = 0
  while (start < text.length) {
    const end = Math.min(start + chunkSize, text.length)
    chunks.push(text.slice(start, end))
    if (end >= text.length) break
    start = end - overlap
  }
  return chunks
}

type MaterialForChunking = {
  id: string
  content: string | null
  title: string | null
  file_name: string | null
  project_id: string
  material_type: string
  created_by?: string | null
}

/**
 * Chunk a material's content and index each chunk in content_index.
 * Deletes existing chunks for this material before inserting new ones.
 * Safe to call fire-and-forget — all errors are logged, not thrown.
 *
 * Only processes materials with content >= MIN_CONTENT_FOR_CHUNKING chars.
 * Short materials are handled by the standard indexContent() path instead.
 */
export async function indexMaterialChunks(
  material: MaterialForChunking,
  organizationId: string,
): Promise<void> {
  if (!material.content || material.content.length < MIN_CONTENT_FOR_CHUNKING) return
  if (!process.env.OPENAI_API_KEY) return

  const chunks = chunkText(material.content)
  const materialTitle = material.title ?? material.file_name ?? 'Untitled'
  const supabase = createUntypedServiceClient()

  // Remove stale chunks before re-indexing
  const { error: deleteError } = await supabase
    .from('content_index')
    .delete()
    .eq('content_type', 'project_material_chunk')
    .filter('metadata->>material_id', 'eq', material.id)

  if (deleteError) {
    console.error(`[chunk-material] Failed to delete old chunks for ${material.id}:`, deleteError.message)
    // Continue — partial re-index is better than no index
  }

  for (let i = 0; i < chunks.length; i++) {
    const chunkContent = chunks[i]

    let embedding: number[]
    try {
      embedding = await embedText(chunkContent)
    } catch (err) {
      console.error(`[chunk-material] Embedding failed for chunk ${i} of material ${material.id}:`, err)
      continue
    }

    const embeddingStr = `[${embedding.join(',')}]`
    const payload: Record<string, unknown> = {
      organization_id: organizationId,
      content_type: 'project_material_chunk',
      content_id: crypto.randomUUID(),
      title: materialTitle,
      summary: chunkContent,
      embedding: embeddingStr as unknown as string,
      metadata: {
        material_id: material.id,
        project_id: material.project_id,
        chunk_index: i,
        total_chunks: chunks.length,
        material_type: material.material_type,
        material_title: materialTitle,
      },
      updated_at: new Date().toISOString(),
    }
    if (material.created_by) payload.created_by = material.created_by

    const { error } = await supabase.from('content_index').insert(payload)
    if (error) {
      console.error(`[chunk-material] Insert failed for chunk ${i} of material ${material.id}:`, error.message)
    }
  }
}
