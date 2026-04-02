import { createClient } from '@/lib/supabase/server'
import { getOrganizationForUser } from '@/lib/queries/organizations'
import { getDiscussionById, getDiscussionParticipants } from '@/lib/queries/discussions'
import { getUserDisplayNamesAndAvatarsByIds } from '@/lib/queries/user-profile'

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

    const discussion = await getDiscussionById(id, org.id)
    if (!discussion) return Response.json({ error: 'Not found' }, { status: 404 })

    const participants = await getDiscussionParticipants(id, org.id)
    const profiles = await getUserDisplayNamesAndAvatarsByIds(participants.map((p) => p.user_id))
    return Response.json({ participants, profiles })
  } catch {
    return Response.json({ error: 'Internal error' }, { status: 500 })
  }
}
