export const dynamic = 'force-dynamic'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getOrganizationForUser } from '@/lib/queries/organizations'
import { getBusinessPlan } from '@/lib/queries/business-plan'
import { BusinessPlanForm } from '@/components/company/business-plan-form'
import { isAtLeastAdmin } from '@/lib/auth/roles'

export default async function BusinessPlanPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const org = await getOrganizationForUser(user.id)
  if (!org) redirect('/setup')

  const plan = await getBusinessPlan(org.id)

  return (
    <BusinessPlanForm
      initial={plan?.sections ?? {}}
      isAdmin={isAtLeastAdmin(org.role)}
      lastSaved={plan?.updated_at ?? null}
    />
  )
}
