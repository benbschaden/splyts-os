export const dynamic = 'force-dynamic'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getOrganizationForUser } from '@/lib/queries/organizations'
import { getFunnels } from '@/lib/queries/funnels'
import { getKpiDefinitions } from '@/lib/queries/kpi-definitions'
import { FunnelsList } from '@/components/company/funnels-list'

export default async function FunnelsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  const org = await getOrganizationForUser(user.id)
  if (!org) redirect('/setup')

  const [funnels, kpiDefinitions] = await Promise.all([
    getFunnels(org.id),
    getKpiDefinitions(org.id),
  ])

  const isAdmin = org.role === 'admin'

  return (
    <div className="p-8 max-w-4xl">
      <div className="mb-6">
        <h1 className="text-lg font-semibold text-foreground">Funnels</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Define conversion funnels from your KPI metrics. Mark one as the dashboard default.
        </p>
      </div>

      <FunnelsList funnels={funnels} kpiDefinitions={kpiDefinitions} isAdmin={isAdmin} />
    </div>
  )
}
