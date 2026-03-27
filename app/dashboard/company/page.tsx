export const dynamic = 'force-dynamic'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getOrganizationForUser } from '@/lib/queries/organizations'
import { getAllOutputsForOrg } from '@/lib/queries/outputs'
import { ContentLibrary } from '@/components/marketing/content-library'

export default async function CompanyContentPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const org = await getOrganizationForUser(user.id)
  if (!org) redirect('/setup')

  const outputs = await getAllOutputsForOrg(org.id)

  return <ContentLibrary outputs={outputs} />
}
