export const dynamic = 'force-dynamic'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getOrganizationForUser } from '@/lib/queries/organizations'
import { getMeetingsForUser } from '@/lib/queries/meetings'
import { getOrgMembersWithProfiles } from '@/lib/queries/teams'
import { MeetingsList } from '@/components/meetings/meetings-list'

export default async function MeetingsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const org = await getOrganizationForUser(user.id)
  if (!org) redirect('/setup')

  const [meetings, orgMembers] = await Promise.all([
    getMeetingsForUser(org.id, user.id),
    getOrgMembersWithProfiles(org.id),
  ])

  return (
    <MeetingsList
      initialMeetings={meetings}
      currentUserId={user.id}
      organizationId={org.id}
      orgMembers={orgMembers.map((m) => ({
        user_id: m.user_id,
        full_name: m.full_name,
      }))}
    />
  )
}
