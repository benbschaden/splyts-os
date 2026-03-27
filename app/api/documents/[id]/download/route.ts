import { createClient } from '@/lib/supabase/server'
import { getOrganizationForUser } from '@/lib/queries/organizations'
import { getDocumentById } from '@/lib/queries/documents'

export async function GET(
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

    // Private docs: only the creator can download
    if (document.visibility === 'private' && document.created_by !== user.id) {
      return Response.json({ error: 'Not found' }, { status: 404 })
    }

    const filename = document.title.replace(/[^a-z0-9\s-]/gi, '').replace(/\s+/g, '-').toLowerCase()
    const markdownContent = `# ${document.title}\n\n${document.content}`

    return new Response(markdownContent, {
      headers: {
        'Content-Type': 'text/markdown; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}.md"`,
      },
    })
  } catch {
    return Response.json({ error: 'Internal error' }, { status: 500 })
  }
}
