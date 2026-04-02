export const dynamic = 'force-dynamic'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getOrganizationForUser } from '@/lib/queries/organizations'
import { getCompetitors } from '@/lib/queries/competitors'
import { CompetitorsList } from '@/components/company/competitors-list'
import { isAtLeastAdmin } from '@/lib/auth/roles'

export default async function CompetitorsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  const org = await getOrganizationForUser(user.id)
  if (!org) redirect('/setup')
  const competitors = await getCompetitors(org.id)
  return (
    <div className="p-8 max-w-4xl">
      <div className="mb-6">
        <h1 className="text-lg font-semibold text-foreground">Competitors</h1>
        <p className="text-sm text-muted-foreground mt-1">Competitive intelligence used in AI-generated content for differentiation.</p>
      </div>
      <CompetitorsList competitors={competitors} isAdmin={isAtLeastAdmin(org.role)} />
    </div>
  )
}
