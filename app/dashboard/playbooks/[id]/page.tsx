export const dynamic = 'force-dynamic'

import { redirect, notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getOrganizationForUser } from '@/lib/queries/organizations'
import { getPlaybookById, canEditPlaybook } from '@/lib/queries/playbooks'
import { PlaybookEditor } from '@/components/playbooks/playbook-editor'

export default async function PlaybookPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const org = await getOrganizationForUser(user.id)
  if (!org) redirect('/setup')

  const playbook = await getPlaybookById(id, org.id)
  if (!playbook) notFound()

  const canEdit = canEditPlaybook(user.id, org.role, playbook)

  return <PlaybookEditor playbook={playbook} canEdit={canEdit} />
}
