export const dynamic = 'force-dynamic'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getOrganizationForUser } from '@/lib/queries/organizations'
import { getActiveContentTypes } from '@/lib/queries/content-types'
import { getAuthorProfiles } from '@/lib/queries/author-profiles'
import { getBrandContext } from '@/lib/queries/brand-context'
import { getProjectsForOrg } from '@/lib/queries/projects'
import { ContentLibrary } from '@/components/marketing/content-library'

export default async function MarketingPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const org = await getOrganizationForUser(user.id)
  if (!org) redirect('/setup')

  const [contentTypes, authors, brandContext, projects] = await Promise.all([
    getActiveContentTypes(org.id),
    getAuthorProfiles(org.id),
    getBrandContext(org.id),
    getProjectsForOrg(org.id),
  ])

  return (
    <ContentLibrary
      contentTypes={contentTypes.map((ct) => ({ id: ct.id, name: ct.name }))}
      authors={authors.map((a) => ({ id: a.id, name: a.name }))}
      hasBrandContext={!!(brandContext?.mission && brandContext?.company_name)}
      projects={projects.map((p) => ({ id: p.id, name: p.name }))}
    />
  )
}
