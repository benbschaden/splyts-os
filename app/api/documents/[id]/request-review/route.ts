import { createClient } from '@/lib/supabase/server'
import { getOrganizationForUser } from '@/lib/queries/organizations'
import { getDocumentById, requestDocumentReview } from '@/lib/queries/documents'

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

    const existing = await getDocumentById(id, org.id)
    if (!existing) return Response.json({ error: 'Not found' }, { status: 404 })
    if (existing.created_by !== user.id) return Response.json({ error: 'Not found' }, { status: 404 })
    if (existing.visibility !== 'shared') {
      return Response.json({ error: 'Document must be shared before requesting review' }, { status: 400 })
    }

    const { document, error } = await requestDocumentReview(id, user.id)
    if (error || !document) return Response.json({ error: 'Failed to request review' }, { status: 500 })

    return Response.json({ document })
  } catch {
    return Response.json({ error: 'Internal error' }, { status: 500 })
  }
}
