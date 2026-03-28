import { createClient } from '@/lib/supabase/server'
import { getOrganizationForUser } from '@/lib/queries/organizations'
import { lockDocument } from '@/lib/queries/documents'

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

    const result = await lockDocument(id, user.id, org.id)

    if (!result.locked) {
      return Response.json(
        { error: 'Document is being edited', lockedBy: result.lockedBy, lockedAt: result.lockedAt },
        { status: 423 },
      )
    }

    return Response.json({ locked: true })
  } catch {
    return Response.json({ error: 'Internal error' }, { status: 500 })
  }
}
