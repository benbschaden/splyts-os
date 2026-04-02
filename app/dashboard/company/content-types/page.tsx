export const dynamic = 'force-dynamic'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getOrganizationForUser } from '@/lib/queries/organizations'
import { getContentTypes, getContentTypeTemplates } from '@/lib/queries/content-types'
import { ContentTypesList } from '@/components/settings/content-types-list'
import { AccessDenied } from '@/components/shared/access-denied'
import { isAtLeastAdmin } from '@/lib/auth/roles'

export default async function CompanyContentTypesPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const org = await getOrganizationForUser(user.id)
  if (!org) redirect('/setup')

  if (!isAtLeastAdmin(org.role)) {
    return (
      <AccessDenied
        message="You do not have permission to manage content types."
        backHref="/dashboard/company"
        backLabel="Back to Company"
      />
    )
  }

  const [contentTypes, templates] = await Promise.all([
    getContentTypes(org.id),
    getContentTypeTemplates(),
  ])

  return (
    <ContentTypesList
      contentTypes={contentTypes as Parameters<typeof ContentTypesList>[0]['contentTypes']}
      templates={templates}
      isAdmin={isAtLeastAdmin(org.role)}
    />
  )
}
