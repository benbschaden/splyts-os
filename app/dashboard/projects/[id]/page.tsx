export const dynamic = 'force-dynamic'

import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getOrganizationForUser } from '@/lib/queries/organizations'
import { getProjectById, getProjectTeams, getProjectMembers } from '@/lib/queries/projects'
import { getOutputsForProject } from '@/lib/queries/outputs'
import { getAttachmentsForOutputs } from '@/lib/queries/output-attachments'
import { getActiveContentTypes } from '@/lib/queries/content-types'
import { getOrgMembersAsAuthors } from '@/lib/queries/user-profile'
import { getBrandContext } from '@/lib/queries/brand-context'
import { getProjectMaterials } from '@/lib/queries/project-materials'
import { getDiscoveryEntries } from '@/lib/queries/discovery-entries'
import { getDiscoveryStudies } from '@/lib/queries/discovery-studies'
import { getContactsForOrg } from '@/lib/queries/contacts'
import { getRecentCommunicationsForOrg } from '@/lib/queries/contact-communications'
import { getCustomerInsightsForOrg } from '@/lib/queries/customer-insights'
import { getCohortDocumentsForProject } from '@/lib/queries/cohort-documents'
import { getPersonas } from '@/lib/queries/personas'
import { getTeamsForOrg, getOrgMembersWithProfiles } from '@/lib/queries/teams'
import { getContentIdeasForProject } from '@/lib/queries/content-ideas'
import { getPublishedOutputsForOrg } from '@/lib/queries/outputs'
import { ProjectDetail } from '@/components/projects/project-detail'
import { isAtLeastAdmin } from '@/lib/auth/roles'

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
    contentIdeas,
    publishedOutputs,
    discoveryStudies,
  ] = await Promise.all([
    getProjectById(id, org.id, user.id),
    getOutputsForProject(id, org.id, user.id),
    getActiveContentTypes(org.id),
    getOrgMembersAsAuthors(org.id),
    getBrandContext(org.id),
    getProjectMaterials(id, org.id),
    getDiscoveryEntries(id, org.id),
    getTeamsForOrg(org.id),
    getOrgMembersWithProfiles(org.id),
    getContentIdeasForProject(id, org.id),
    getPublishedOutputsForOrg(org.id),
    getDiscoveryStudies(id, org.id),
  ])

  if (!project) notFound()

  const isCustomerHub = project.tool_key === 'customer_hub'

  const [projectTeams, projectMembers, hubContacts, hubCommunications, hubInsights, hubCohortDocuments, hubPersonas] = await Promise.all([
    getProjectTeams(id),
    getProjectMembers(id),
    isCustomerHub ? getContactsForOrg(org.id) : Promise.resolve([]),
    isCustomerHub ? getRecentCommunicationsForOrg(org.id) : Promise.resolve([]),
    isCustomerHub ? getCustomerInsightsForOrg(org.id) : Promise.resolve([]),
    isCustomerHub ? getCohortDocumentsForProject(id, org.id) : Promise.resolve([]),
    isCustomerHub ? getPersonas(org.id) : Promise.resolve([]),
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
      organizationId={org.id}
      currentUserId={user.id}
      isAdmin={isAtLeastAdmin(org.role)}
      isCreator={project.created_by === user.id}
      outputs={outputs}
      outputAttachmentsByOutputId={outputAttachmentsByOutputId}
      contentTypes={contentTypes.map((ct) => ({ id: ct.id, name: ct.name }))}
      authors={authors}
      hasBrandContext={!!(brandContext?.mission && brandContext?.company_name)}
      materials={materials}
      discoveryEntries={discoveryEntries}
      discoveryStudies={discoveryStudies}
      orgTeams={orgTeams.map((t) => ({ id: t.id, name: t.name }))}
      orgMembers={orgMembers.map((m) => ({ user_id: m.user_id, full_name: m.full_name }))}
      projectTeams={projectTeams}
      projectMembers={projectMembers.map((m) => ({ user_id: m.user_id, full_name: m.full_name }))}
      contentIdeas={contentIdeas}
      publishedOutputs={publishedOutputs}
      hubContacts={hubContacts}
      hubCommunications={hubCommunications}
      hubInsights={hubInsights}
      hubCohortDocuments={hubCohortDocuments}
      hubPersonas={hubPersonas}
    />
  )
}
