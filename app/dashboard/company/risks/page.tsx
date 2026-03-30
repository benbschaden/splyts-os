export const dynamic = 'force-dynamic'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getOrganizationForUser } from '@/lib/queries/organizations'
import { getRisks } from '@/lib/queries/risks'
import { RiskRegister } from '@/components/company/risk-register'

export default async function RisksPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  const org = await getOrganizationForUser(user.id)
  if (!org) redirect('/setup')

  const risks = await getRisks(org.id)
  const isAdmin = org.role === 'admin'

  return (
    <div className="p-8 max-w-5xl">
      <div className="mb-6">
        <h1 className="text-lg font-semibold text-foreground">Risk Register</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Identify, score, and track risks. Priority score = likelihood × impact (1–25).
          Open and monitoring risks are included in the business plan PDF.
        </p>
      </div>

      <RiskRegister initialRisks={risks} isAdmin={isAdmin} />
    </div>
  )
}
