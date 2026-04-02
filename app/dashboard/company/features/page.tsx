export const dynamic = 'force-dynamic'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getOrganizationForUser } from '@/lib/queries/organizations'
import { FeaturesList } from '@/components/company/features-list'
import { isAtLeastAdmin } from '@/lib/auth/roles'

export default async function ProductFeaturesPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const org = await getOrganizationForUser(user.id)
  if (!org) redirect('/setup')

  return <FeaturesList isAdmin={isAtLeastAdmin(org.role)} />
}
