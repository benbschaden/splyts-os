export const dynamic = 'force-dynamic'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getOrganizationForUser } from '@/lib/queries/organizations'
import { getKpiDefinitions } from '@/lib/queries/kpi-definitions'
import { getLatestSnapshot } from '@/lib/queries/kpi-snapshots'
import { KpiDefinitionsList } from '@/components/company/kpi-definitions-list'
import { KpiSnapshotForm } from '@/components/company/kpi-snapshot-form'

export default async function KpisPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  const org = await getOrganizationForUser(user.id)
  if (!org) redirect('/setup')

  const [definitions, latestSnapshot] = await Promise.all([
    getKpiDefinitions(org.id),
    getLatestSnapshot(org.id),
  ])

  const isAdmin = org.role === 'admin'

  return (
    <div className="p-8 max-w-4xl">
      <div className="mb-6">
        <h1 className="text-lg font-semibold text-foreground">KPIs &amp; Metrics</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Define what you track and enter weekly values. Latest snapshot feeds into AI prompts.
        </p>
      </div>

      <div className="space-y-10">
        <KpiDefinitionsList definitions={definitions} isAdmin={isAdmin} />

        <div className="border-t border-border pt-8">
          <KpiSnapshotForm
            definitions={definitions}
            latestSnapshot={latestSnapshot}
            isAdmin={isAdmin}
          />
        </div>
      </div>
    </div>
  )
}
