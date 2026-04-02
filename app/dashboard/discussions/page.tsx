import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getOrganizationForUser } from '@/lib/queries/organizations'
import { DiscussionsInbox } from '@/components/discussions/discussions-inbox'

export const dynamic = 'force-dynamic'

export default async function DiscussionsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const org = await getOrganizationForUser(user.id)
  if (!org) redirect('/setup')

  return (
    <div className="flex h-full flex-col">
      <DiscussionsInbox currentUserId={user.id} organizationId={org.id} />
    </div>
  )
}
