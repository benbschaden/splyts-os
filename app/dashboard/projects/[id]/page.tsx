export const dynamic = 'force-dynamic'

import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getOrganizationForUser } from '@/lib/queries/organizations'
import { getProjectById } from '@/lib/queries/projects'
import { getOutputsForProject } from '@/lib/queries/outputs'
import { getActiveContentTypes } from '@/lib/queries/content-types'
import { getAuthorProfiles } from '@/lib/queries/author-profiles'
import { getBrandContext } from '@/lib/queries/brand-context'
import { ProjectDetail } from '@/components/projects/project-detail'

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function ProjectPage({ params }: PageProps) {
  const { id } = await params

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const org = await getOrganizationForUser(user.id)
  if (!org) redirect('/setup')

  const [project, outputs, contentTypes, authors, brandContext] = await Promise.all([
    getProjectById(id, org.id),
    getOutputsForProject(id, org.id),
    getActiveContentTypes(org.id),
    getAuthorProfiles(org.id),
    getBrandContext(org.id),
  ])

  if (!project) notFound()

  return (
    <ProjectDetail
      project={project}
      isAdmin={org.role === 'admin'}
      outputs={outputs}
      contentTypes={contentTypes.map((ct) => ({ id: ct.id, name: ct.name }))}
      authors={authors.map((a) => ({ id: a.id, name: a.name }))}
      hasBrandContext={!!(brandContext?.mission && brandContext?.company_name)}
    />
  )
}
