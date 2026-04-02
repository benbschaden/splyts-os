import { createClient } from '@/lib/supabase/server'
import { getOrganizationForUser } from '@/lib/queries/organizations'
import { revokeInvite } from '@/lib/queries/team'
import { isAtLeastAdmin } from '@/lib/auth/roles'

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const org = await getOrganizationForUser(user.id)
  if (!org) return Response.json({ error: 'Organisation not found' }, { status: 404 })
  if (!isAtLeastAdmin(org.role)) return Response.json({ error: 'Admin access required' }, { status: 403 })

  const { error } = await revokeInvite(id, org.id)
  if (error) return Response.json({ error }, { status: 500 })

  return new Response(null, { status: 204 })
}
