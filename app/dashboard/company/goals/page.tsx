export const dynamic = 'force-dynamic'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getOrganizationForUser } from '@/lib/queries/organizations'
import { getCurrentGoals } from '@/lib/queries/current-goals'
import { CurrentGoalsForm } from '@/components/company/current-goals-form'

export default async function CurrentGoalsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const org = await getOrganizationForUser(user.id)
  if (!org) redirect('/setup')

  const goals = await getCurrentGoals(org.id)

  return (
    <CurrentGoalsForm
      initial={goals?.sections ?? null}
      isAdmin={org.role === 'admin'}
    />
  )
}
