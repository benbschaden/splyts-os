export const dynamic = 'force-dynamic'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getOrganizationForUser } from '@/lib/queries/organizations'
import { getContentTypes, getContentTypeTemplates } from '@/lib/queries/content-types'
import { ContentTypesList } from '@/components/settings/content-types-list'
import { AccessDenied } from '@/components/shared/access-denied'

export default async function ContentTypesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const org = await getOrganizationForUser(user.id)
  if (!org) redirect('/setup')

  if (org.role !== 'admin') {
    return <AccessDenied message="You do not have permission to manage content types." backHref="/dashboard/marketing" backLabel="Back to Marketing" />
  }

  const [contentTypes, templates] = await Promise.all([
    getContentTypes(org.id),
    getContentTypeTemplates(),
  ])

  return (
    <ContentTypesList
      contentTypes={contentTypes as Parameters<typeof ContentTypesList>[0]['contentTypes']}
      templates={templates}
      isAdmin={org.role === 'admin'}
    />
  )
}
