import { createClient } from '@/lib/supabase/server'
import { getOrganizationForUser } from '@/lib/queries/organizations'
import { listActiveConflicts } from '@/lib/queries/company-knowledge'

export async function GET() {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

    const org = await getOrganizationForUser(user.id)
    if (!org) return Response.json({ error: 'Not found' }, { status: 404 })

    const { data: conflicts, error } = await listActiveConflicts(supabase, org.id)
    if (error) {
      console.error('[company-knowledge/conflicts GET]', error)
      return Response.json({ error: 'Failed to load conflicts' }, { status: 500 })
    }

    return Response.json({ conflicts: conflicts ?? [] })
  } catch (err) {
    console.error('[company-knowledge/conflicts GET]', err)
    return Response.json({ error: 'Internal error' }, { status: 500 })
  }
}
