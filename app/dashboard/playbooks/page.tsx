export const dynamic = 'force-dynamic'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getOrganizationForUser } from '@/lib/queries/organizations'
import { getPlaybooks } from '@/lib/queries/playbooks'
import { PlaybooksList } from '@/components/playbooks/playbooks-list'

export default async function PlaybooksPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const org = await getOrganizationForUser(user.id)
  if (!org) redirect('/setup')

  const playbooks = await getPlaybooks(org.id)

  return <PlaybooksList playbooks={playbooks} />
}
