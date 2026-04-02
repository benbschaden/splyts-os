export const dynamic = 'force-dynamic'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getOrganizationForUser } from '@/lib/queries/organizations'
import { MilestonesList } from '@/components/company/milestones-list'
import { isAtLeastAdmin } from '@/lib/auth/roles'

export default async function CompanyMilestonesPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const org = await getOrganizationForUser(user.id)
  if (!org) redirect('/setup')

  return <MilestonesList isAdmin={isAtLeastAdmin(org.role)} />
}
