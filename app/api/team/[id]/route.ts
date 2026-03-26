import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { getOrganizationForUser } from '@/lib/queries/organizations'
import { updateMemberRole, removeMember } from '@/lib/queries/team'

const patchSchema = z.object({
  role: z.enum(['admin', 'member']),
})

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: targetUserId } = await params

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const org = await getOrganizationForUser(user.id)
  if (!org) return Response.json({ error: 'Organisation not found' }, { status: 404 })
  if (org.role !== 'admin') return Response.json({ error: 'Admin access required' }, { status: 403 })

  // Prevent changing your own role
  if (targetUserId === user.id) {
    return Response.json({ error: 'You cannot change your own role' }, { status: 400 })
  }

  const body = await request.json()
  const parsed = patchSchema.safeParse(body)
  if (!parsed.success) {
    return Response.json({ error: parsed.error.errors[0].message }, { status: 400 })
  }

  const { error } = await updateMemberRole(org.id, targetUserId, parsed.data.role)
  if (error) return Response.json({ error }, { status: 500 })

  return Response.json({ message: 'Role updated' })
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: targetUserId } = await params

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const org = await getOrganizationForUser(user.id)
  if (!org) return Response.json({ error: 'Organisation not found' }, { status: 404 })
  if (org.role !== 'admin') return Response.json({ error: 'Admin access required' }, { status: 403 })

  if (targetUserId === user.id) {
    return Response.json({ error: 'You cannot remove yourself from the organisation' }, { status: 400 })
  }

  const { error } = await removeMember(org.id, targetUserId)
  if (error) return Response.json({ error }, { status: 500 })

  return new Response(null, { status: 204 })
}
