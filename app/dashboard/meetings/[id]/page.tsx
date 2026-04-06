export const dynamic = 'force-dynamic'

import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getOrganizationForUser } from '@/lib/queries/organizations'
import { getMeetingById, getAttendeesForMeeting } from '@/lib/queries/meetings'
import { getOrgMembersWithProfiles } from '@/lib/queries/teams'
import { MeetingDetail } from '@/components/meetings/meeting-detail'

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function MeetingDetailPage({ params }: PageProps) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const org = await getOrganizationForUser(user.id)
  if (!org) redirect('/setup')

  const [meeting, attendees, orgMembers] = await Promise.all([
    getMeetingById(id, org.id, user.id),
    getAttendeesForMeeting(id),
    getOrgMembersWithProfiles(org.id),
  ])

  if (!meeting) notFound()

  return (
    <MeetingDetail
      meeting={meeting}
      attendees={attendees}
      isCreator={meeting.created_by === user.id}
      organizationId={org.id}
      orgMembers={orgMembers.map((m) => ({
        user_id: m.user_id,
        full_name: m.full_name,
      }))}
    />
  )
}
