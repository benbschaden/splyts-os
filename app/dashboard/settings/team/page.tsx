export const dynamic = 'force-dynamic'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getOrganizationForUser } from '@/lib/queries/organizations'
import { getTeamMembers, getPendingInvites } from '@/lib/queries/team'
import { TeamManager } from '@/components/settings/team-manager'
import { AccessDenied } from '@/components/shared/access-denied'

export default async function TeamPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const org = await getOrganizationForUser(user.id)
  if (!org) redirect('/setup')

  if (org.role !== 'admin') {
    return <AccessDenied message="You do not have permission to manage team members." backHref="/dashboard" backLabel="Back to dashboard" />
  }

  const [members, pendingInvites] = await Promise.all([
    getTeamMembers(org.id),
    getPendingInvites(org.id),
  ])

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
      />
    </div>
  )
}
