export const dynamic = 'force-dynamic'

import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getOrganizationForUser } from '@/lib/queries/organizations'
import { getProjectById, getProjectTeams, getProjectMembers } from '@/lib/queries/projects'
import { getOutputsForProject } from '@/lib/queries/outputs'
import { getAttachmentsForOutputs } from '@/lib/queries/output-attachments'
import { getActiveContentTypes } from '@/lib/queries/content-types'
import { getAuthorProfiles } from '@/lib/queries/author-profiles'
import { getBrandContext } from '@/lib/queries/brand-context'
import { getProjectMaterials } from '@/lib/queries/project-materials'
import { getDiscoveryEntries } from '@/lib/queries/discovery-entries'
import { getTeamsForOrg, getOrgMembersWithProfiles } from '@/lib/queries/teams'
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

  const [
    project,
    outputs,
    contentTypes,
    authors,
    brandContext,
    materials,
    discoveryEntries,
    orgTeams,
    orgMembers,
  ] = await Promise.all([
    getProjectById(id, org.id, user.id),
    getOutputsForProject(id, org.id),
    getActiveContentTypes(org.id),
    getAuthorProfiles(org.id),
    getBrandContext(org.id),
    getProjectMaterials(id, org.id),
    getDiscoveryEntries(id, org.id),
    getTeamsForOrg(org.id),
    getOrgMembersWithProfiles(org.id),
  ])

  if (!project) notFound()

  const [projectTeams, projectMembers] = await Promise.all([
    getProjectTeams(id),
    getProjectMembers(id),
  ])

  const outputAttachmentsByOutputId =
    outputs.length > 0
      ? Object.fromEntries(
          Object.entries(await getAttachmentsForOutputs(outputs.map((o) => o.id))).map(([id, rows]) => [
            id,
            rows.map((a) => ({
              id: a.id,
              file_url: a.file_url,
              file_name: a.file_name,
              file_mime: a.file_mime,
              caption: a.caption,
            })),
          ]),
        )
      : {}

  return (
    <ProjectDetail
      project={project}
      currentUserId={user.id}
      isAdmin={org.role === 'admin'}
      isCreator={project.created_by === user.id}
      outputs={outputs}
      outputAttachmentsByOutputId={outputAttachmentsByOutputId}
      contentTypes={contentTypes.map((ct) => ({ id: ct.id, name: ct.name }))}
      authors={authors.map((a) => ({ id: a.id, name: a.name }))}
      hasBrandContext={!!(brandContext?.mission && brandContext?.company_name)}
      materials={materials}
      discoveryEntries={discoveryEntries}
      orgTeams={orgTeams.map((t) => ({ id: t.id, name: t.name }))}
      orgMembers={orgMembers.map((m) => ({ user_id: m.user_id, full_name: m.full_name }))}
      projectTeams={projectTeams}
      projectMembers={projectMembers.map((m) => ({ user_id: m.user_id, full_name: m.full_name }))}
    />
  )
}
