import { createUntypedServiceClient } from '@/lib/supabase/service'

export interface MeetingDocumentRow {
  id: string
  meeting_id: string
  organization_id: string
  created_by: string
  title: string
  content: string
  status: 'draft' | 'published'
  published_at: string | null
  created_at: string
  updated_at: string
  deleted_at: string | null
}

const DOC_COLUMNS =
  'id, meeting_id, organization_id, created_by, title, content, status, published_at, created_at, updated_at, deleted_at'

export async function getMeetingDocumentsForMeeting(
  meetingId: string,
  orgId: string,
): Promise<MeetingDocumentRow[]> {
  const supabase = createUntypedServiceClient()
  const { data, error } = await supabase
    .from('meeting_documents')
    .select(DOC_COLUMNS)
    .eq('meeting_id', meetingId)
    .eq('organization_id', orgId)
    .is('deleted_at', null)
    .order('updated_at', { ascending: false })

  if (error || !data) return []
  return data as unknown as MeetingDocumentRow[]
}

export type MeetingDocumentWithProjects = MeetingDocumentRow & { project_ids: string[] }

/** Published doc shown on a project Meetings tab */
export type PublishedMeetingDocForProject = MeetingDocumentRow & { meeting_title: string }

export async function getMeetingDocumentsForMeetingWithProjects(
  meetingId: string,
  orgId: string,
): Promise<MeetingDocumentWithProjects[]> {
  const docs = await getMeetingDocumentsForMeeting(meetingId, orgId)
  const enriched = await Promise.all(
    docs.map(async (d) => ({
      ...d,
      project_ids:
        d.status === 'published' ? await getProjectIdsForMeetingDocument(d.id) : [],
    })),
  )
  return enriched
}

export async function getMeetingDocumentById(
  id: string,
  orgId: string,
): Promise<MeetingDocumentRow | null> {
  const supabase = createUntypedServiceClient()
  const { data, error } = await supabase
    .from('meeting_documents')
    .select(DOC_COLUMNS)
    .eq('id', id)
    .eq('organization_id', orgId)
    .is('deleted_at', null)
    .maybeSingle()

  if (error || !data) return null
  return data as unknown as MeetingDocumentRow
}

/**
 * Published meeting documents visible on a project, scoped to meetings the user can access.
 */
export async function getPublishedMeetingDocumentsForProject(
  projectId: string,
  orgId: string,
  userId: string,
): Promise<PublishedMeetingDocForProject[]> {
  const supabase = createUntypedServiceClient()

  const { data: links, error: linkErr } = await supabase
    .from('meeting_document_projects')
    .select('meeting_document_id')
    .eq('project_id', projectId)

  if (linkErr || !links?.length) return []

  const docIds = (links as { meeting_document_id: string }[]).map((l) => l.meeting_document_id)

  const { data: docs, error: docErr } = await supabase
    .from('meeting_documents')
    .select(DOC_COLUMNS)
    .in('id', docIds)
    .eq('organization_id', orgId)
    .eq('status', 'published')
    .is('deleted_at', null)

  if (docErr || !docs?.length) return []

  const meetingIds = Array.from(new Set((docs as MeetingDocumentRow[]).map((d) => d.meeting_id)))

  const { data: meetings } = await supabase
    .from('meetings')
    .select('id, title, created_by, visibility')
    .in('id', meetingIds)
    .eq('organization_id', orgId)
    .is('deleted_at', null)

  const { data: attendeeRows } = await supabase
    .from('meeting_attendees')
    .select('meeting_id')
    .in('meeting_id', meetingIds)
    .eq('user_id', userId)

  const attended = new Set((attendeeRows ?? []).map((r: { meeting_id: string }) => r.meeting_id))

  const titleMap = new Map(
    (meetings ?? []).map((m: { id: string; title: string }) => [m.id, m.title]),
  )
  const meetingMeta = new Map(
    (meetings ?? []).map((m: { id: string; created_by: string; visibility: string }) => [
      m.id,
      { created_by: m.created_by, visibility: m.visibility },
    ]),
  )

  const visible = (docs as MeetingDocumentRow[]).filter((d) => {
    const meta = meetingMeta.get(d.meeting_id)
    if (!meta) return false
    if (meta.created_by === userId) return true
    if (meta.visibility === 'org_wide') return true
    return attended.has(d.meeting_id)
  })

  const mapped: PublishedMeetingDocForProject[] = visible.map((d) => ({
    ...d,
    meeting_title: titleMap.get(d.meeting_id) ?? 'Meeting',
  }))
  return mapped.sort((a, b) =>
    (b.published_at ?? b.updated_at).localeCompare(a.published_at ?? a.updated_at),
  )
}

export async function getProjectIdsForMeetingDocument(
  documentId: string,
): Promise<string[]> {
  const supabase = createUntypedServiceClient()
  const { data } = await supabase
    .from('meeting_document_projects')
    .select('project_id')
    .eq('meeting_document_id', documentId)

  return (data ?? []).map((r: { project_id: string }) => r.project_id)
}

export async function getProjectIdsLinkedToMeeting(meetingId: string): Promise<string[]> {
  const supabase = createUntypedServiceClient()
  const { data } = await supabase
    .from('meeting_project_links')
    .select('project_id')
    .eq('meeting_id', meetingId)

  return (data ?? []).map((r: { project_id: string }) => r.project_id)
}

export async function validateProjectIdsInOrg(orgId: string, projectIds: string[]): Promise<boolean> {
  if (projectIds.length === 0) return true
  const supabase = createUntypedServiceClient()
  const { data, error } = await supabase
    .from('projects')
    .select('id')
    .eq('organization_id', orgId)
    .in('id', projectIds)
    .is('deleted_at', null)

  if (error) return false
  return (data?.length ?? 0) === projectIds.length
}

export async function createMeetingDocument(params: {
  meetingId: string
  orgId: string
  userId: string
  title: string
  content: string
}): Promise<{ document: MeetingDocumentRow | null; error: string | null }> {
  const supabase = createUntypedServiceClient()
  const { data, error } = await supabase
    .from('meeting_documents')
    .insert({
      meeting_id: params.meetingId,
      organization_id: params.orgId,
      created_by: params.userId,
      title: params.title,
      content: params.content,
      status: 'draft',
    })
    .select(DOC_COLUMNS)
    .single()

  if (error || !data) {
    console.error('[meeting-documents] create:', error)
    return { document: null, error: 'Failed to save document' }
  }
  return { document: data as unknown as MeetingDocumentRow, error: null }
}

export async function updateMeetingDocument(params: {
  id: string
  orgId: string
  userId: string
  title?: string
  content?: string
}): Promise<{ error: string | null }> {
  const supabase = createUntypedServiceClient()
  const updates: Record<string, unknown> = {}
  if (params.title !== undefined) updates.title = params.title
  if (params.content !== undefined) updates.content = params.content
  if (Object.keys(updates).length === 0) return { error: null }

  const { error } = await supabase
    .from('meeting_documents')
    .update(updates)
    .eq('id', params.id)
    .eq('organization_id', params.orgId)
    .eq('created_by', params.userId)
    .is('deleted_at', null)

  if (error) {
    console.error('[meeting-documents] update:', error)
    return { error: 'Failed to update document' }
  }
  return { error: null }
}

/**
 * Publish: set status, set project links (replaces existing links for this document).
 */
export async function publishMeetingDocument(params: {
  documentId: string
  orgId: string
  userId: string
  projectIds: string[]
}): Promise<{ error: string | null }> {
  const supabase = createUntypedServiceClient()

  const { data: doc } = await supabase
    .from('meeting_documents')
    .select('id, created_by, status')
    .eq('id', params.documentId)
    .eq('organization_id', params.orgId)
    .is('deleted_at', null)
    .maybeSingle()

  if (!doc || (doc as { created_by: string }).created_by !== params.userId) {
    return { error: 'Not found' }
  }

  const now = new Date().toISOString()
  const { error: upErr } = await supabase
    .from('meeting_documents')
    .update({
      status: 'published',
      published_at: now,
    })
    .eq('id', params.documentId)
    .eq('organization_id', params.orgId)

  if (upErr) {
    console.error('[meeting-documents] publish status:', upErr)
    return { error: 'Failed to publish' }
  }

  await supabase
    .from('meeting_document_projects')
    .delete()
    .eq('meeting_document_id', params.documentId)

  if (params.projectIds.length > 0) {
    const { error: linkErr } = await supabase.from('meeting_document_projects').insert(
      params.projectIds.map((projectId) => ({
        meeting_document_id: params.documentId,
        project_id: projectId,
        linked_by: params.userId,
      })),
    )
    if (linkErr) {
      console.error('[meeting-documents] publish links:', linkErr)
      return { error: 'Failed to link projects' }
    }
  }

  return { error: null }
}
