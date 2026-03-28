import { createClient } from '@/lib/supabase/server'
import { getOrganizationForUser } from '@/lib/queries/organizations'
import { getDocumentById, upsertDocumentEmbedding } from '@/lib/queries/documents'
import { embedText } from '@/lib/retrieval/embed'

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

    const org = await getOrganizationForUser(user.id)
    if (!org) return Response.json({ error: 'Not found' }, { status: 404 })

    const document = await getDocumentById(id, org.id)
    if (!document) return Response.json({ error: 'Not found' }, { status: 404 })

    if (!process.env.OPENAI_API_KEY) {
      return Response.json({ error: 'Embedding not configured' }, { status: 503 })
    }

    // Embed summary if available, otherwise first 8000 chars of content
    const textToEmbed = document.summary
      ? `${document.title}\n\n${document.summary}`
      : `${document.title}\n\n${document.content.slice(0, 8000)}`

    const embedding = await embedText(textToEmbed)

    await upsertDocumentEmbedding({
      documentId: id,
      content: textToEmbed,
      embedding,
    })

    return Response.json({ embedded: true })
  } catch (err) {
    console.error('[documents/embed] Error:', err)
    return Response.json({ error: 'Embedding failed' }, { status: 500 })
  }
}
