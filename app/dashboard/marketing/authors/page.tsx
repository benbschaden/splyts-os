export const dynamic = 'force-dynamic'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getOrganizationForUser } from '@/lib/queries/organizations'
import { getAuthorProfiles } from '@/lib/queries/author-profiles'
import { AuthorsList } from '@/components/settings/authors-list'

export default async function AuthorsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const org = await getOrganizationForUser(user.id)
  if (!org) redirect('/setup')

  const authors = await getAuthorProfiles(org.id)

  return (
    <AuthorsList
      authors={authors}
      isAdmin={org.role === 'admin'}
    />
  )
}
