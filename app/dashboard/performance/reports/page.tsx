export const dynamic = 'force-dynamic'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getOrganizationForUser } from '@/lib/queries/organizations'
import { isOwner } from '@/lib/auth/roles'
import { ActivityReportClient } from '@/components/performance/activity-report-client'

export default async function ReportsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const org = await getOrganizationForUser(user.id)
  if (!org) redirect('/setup')

  if (!isOwner(org.role)) {
    redirect('/dashboard/performance')
  }

  return <ActivityReportClient />
}
