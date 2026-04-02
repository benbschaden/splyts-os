export const dynamic = 'force-dynamic'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getOrganizationForUser } from '@/lib/queries/organizations'
import { getTeamMembers, getPendingInvites } from '@/lib/queries/team'
import { getTeamMembersWithRoles, getTeamsForOrg } from '@/lib/queries/teams'
import { TeamManager } from '@/components/settings/team-manager'
import { AccessDenied } from '@/components/shared/access-denied'
import { isAtLeastAdmin } from '@/lib/auth/roles'

export default async function TeamPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const org = await getOrganizationForUser(user.id)
  if (!org) redirect('/setup')

  if (!isAtLeastAdmin(org.role)) {
    return <AccessDenied message="You do not have permission to manage team members." backHref="/dashboard" backLabel="Back to dashboard" />
  }

  const [members, pendingInvites, teams] = await Promise.all([
    getTeamMembers(org.id),
    getPendingInvites(org.id),
    getTeamsForOrg(org.id),
  ])

  const reviewerTeams = await Promise.all(
    teams.map(async (team) => ({
      id: team.id,
      name: team.name,
      members: await getTeamMembersWithRoles(team.id),
    })),
  )

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h2 className="text-sm font-semibold text-foreground">Team</h2>
        <p className="text-sm text-muted-foreground">
          Manage who has access to your workspace and their roles.
        </p>
      </div>

      <TeamManager
        members={members}
        pendingInvites={pendingInvites}
        currentUserId={user.id}
        reviewerTeams={reviewerTeams}
      />
    </div>
  )
}
