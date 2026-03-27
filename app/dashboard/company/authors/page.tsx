export const dynamic = 'force-dynamic'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getOrganizationForUser } from '@/lib/queries/organizations'
import { getAuthorProfiles } from '@/lib/queries/author-profiles'
import { AuthorsList } from '@/components/settings/authors-list'
import { AccessDenied } from '@/components/shared/access-denied'

export default async function CompanyAuthorsPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const org = await getOrganizationForUser(user.id)
  if (!org) redirect('/setup')

  if (org.role !== 'admin') {
    return (
      <AccessDenied
        message="You do not have permission to manage author profiles."
        backHref="/dashboard/company"
        backLabel="Back to Company"
      />
    )
  }

  const authors = await getAuthorProfiles(org.id)

  return <AuthorsList authors={authors} isAdmin={org.role === 'admin'} />
}
