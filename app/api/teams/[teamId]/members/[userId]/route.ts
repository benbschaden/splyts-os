import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { getOrganizationForUser } from '@/lib/queries/organizations'
import { updateTeamMemberRole } from '@/lib/queries/teams'

const patchSchema = z.object({
  role: z.enum(['member', 'reviewer']),
})

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ teamId: string; userId: string }> },
) {
  try {
    const { teamId, userId } = await params

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

    const org = await getOrganizationForUser(user.id)
    if (!org) return Response.json({ error: 'Not found' }, { status: 404 })
    if (org.role !== 'admin') return Response.json({ error: 'Admin access required' }, { status: 403 })

    const body = await request.json()
    const parsed = patchSchema.safeParse(body)
    if (!parsed.success) return Response.json({ error: 'Invalid input' }, { status: 400 })

    const service = createServiceClient()

    // Ensure team belongs to org
    const { data: team } = await service
      .from('teams')
      .select('id')
      .eq('id', teamId)
      .eq('organization_id', org.id)
      .is('deleted_at', null)
      .maybeSingle()
    if (!team) return Response.json({ error: 'Not found' }, { status: 404 })

    // Ensure target is an actual member of this team
    const { data: member } = await service
      .from('team_members')
      .select('user_id')
      .eq('team_id', teamId)
      .eq('user_id', userId)
      .maybeSingle()
    if (!member) return Response.json({ error: 'Team member not found' }, { status: 404 })

    const { error } = await updateTeamMemberRole(teamId, userId, parsed.data.role)
    if (error) return Response.json({ error }, { status: 500 })

    return Response.json({ success: true })
  } catch {
    return Response.json({ error: 'Internal error' }, { status: 500 })
  }
}
