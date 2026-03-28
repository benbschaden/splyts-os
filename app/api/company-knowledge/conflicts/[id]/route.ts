import { createClient } from '@/lib/supabase/server'
import { getOrganizationForUser } from '@/lib/queries/organizations'
import { dismissConflict } from '@/lib/queries/company-knowledge'

export async function PATCH(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

    const org = await getOrganizationForUser(user.id)
    if (!org) return Response.json({ error: 'Not found' }, { status: 404 })

    if (org.role !== 'admin') {
      return Response.json({ error: 'Not found' }, { status: 404 })
    }

    const { id } = await params
    const { data, error } = await dismissConflict(supabase, id, org.id, user.id)

    if (error || !data) {
      return Response.json({ error: 'Not found' }, { status: 404 })
    }

    return Response.json({ ok: true })
  } catch (err) {
    console.error('[company-knowledge/conflicts/[id] PATCH]', err)
    return Response.json({ error: 'Internal error' }, { status: 500 })
  }
}
