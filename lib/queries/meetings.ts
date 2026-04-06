import { createUntypedServiceClient } from '@/lib/supabase/service'

// -------------------------------------------------------
// Types
// -------------------------------------------------------

export interface ExtractedDecision {
  text: string
  owner: string | null
}

export interface ExtractedActionItem {
  text: string
  assignee_name: string | null
}

export interface ExtractedQuestion {
  text: string
}

export interface SuggestedProjectLink {
  project_id: string
  project_name: string
  rationale: string
  relevant_decisions: number[]
  relevant_actions: number[]
}

export interface MeetingRow {
  id: string
  organization_id: string
  created_by: string
  title: string
  meeting_date: string | null
  raw_transcript: string
  processed_summary: string | null
  extracted_decisions: ExtractedDecision[] | null
  extracted_action_items: ExtractedActionItem[] | null
  extracted_open_questions: ExtractedQuestion[] | null
  suggested_project_links: SuggestedProjectLink[] | null
  processed_at: string | null
  accepted_at: string | null
  visibility: 'attendees_only' | 'org_wide'
  created_at: string
  updated_at: string
  deleted_at: string | null
}

export interface MeetingAttendee {
  meeting_id: string
  user_id: string
  added_by: string
  added_at: string
  full_name: string | null
  avatar_url: string | null
}

export interface MeetingProjectLink {
  meeting_id: string
  project_id: string
  relevant_summary: string | null
  linked_by: string
  linked_at: string
  project_name: string | null
}

const MEETING_COLUMNS =
  'id, organization_id, created_by, title, meeting_date, raw_transcript, processed_summary, extracted_decisions, extracted_action_items, extracted_open_questions, suggested_project_links, processed_at, accepted_at, visibility, created_at, updated_at, deleted_at'

// -------------------------------------------------------
// Access check helpers
// -------------------------------------------------------

/**
 * Returns true if userId can access the given meeting.
 * A user has access if:
 *  - they created the meeting, OR
 *  - the meeting is org_wide and they are an org member, OR
 *  - they are in meeting_attendees
 */
async function canUserAccessMeeting(
  meetingId: string,
  orgId: string,
  userId: string,
): Promise<boolean> {
  const supabase = createUntypedServiceClient()

  const { data: meeting } = await supabase
    .from('meetings')
    .select('id, created_by, visibility')
    .eq('id', meetingId)
    .eq('organization_id', orgId)
    .is('deleted_at', null)
    .maybeSingle()

  if (!meeting) return false
  if ((meeting as { created_by: string }).created_by === userId) return true
  if ((meeting as { visibility: string }).visibility === 'org_wide') return true

  const { data: attendee } = await supabase
    .from('meeting_attendees')
    .select('user_id')
    .eq('meeting_id', meetingId)
    .eq('user_id', userId)
    .maybeSingle()

  return !!attendee
}

// -------------------------------------------------------
// Queries
// -------------------------------------------------------

/**
 * Returns all meetings visible to the given user within the org.
 * Includes meetings where they are: creator, attendee, or org_wide visibility.
 */
export async function getMeetingsForUser(
  orgId: string,
  userId: string,
): Promise<MeetingRow[]> {
  const supabase = createUntypedServiceClient()

  // Get all non-deleted meetings for the org
  const { data: allMeetings, error } = await supabase
    .from('meetings')
    .select(MEETING_COLUMNS)
    .eq('organization_id', orgId)
    .is('deleted_at', null)
    .order('meeting_date', { ascending: false, nullsFirst: false })
    .order('created_at', { ascending: false })

  if (error || !allMeetings) return []

  // Get attendee records for this user to determine access
  const meetingIds = (allMeetings as MeetingRow[]).map((m) => m.id)
  if (meetingIds.length === 0) return []

  const { data: attendeeRows } = await supabase
    .from('meeting_attendees')
    .select('meeting_id')
    .in('meeting_id', meetingIds)
    .eq('user_id', userId)

  const attendedIds = new Set((attendeeRows ?? []).map((r: { meeting_id: string }) => r.meeting_id))

  return (allMeetings as MeetingRow[]).filter((m) => {
    if (m.created_by === userId) return true
    if (m.visibility === 'org_wide') return true
    return attendedIds.has(m.id)
  })
}

/**
 * Returns a single meeting by ID if the given user can access it.
 * Returns null if not found or access denied.
 */
export async function getMeetingById(
  id: string,
  orgId: string,
  userId: string,
): Promise<MeetingRow | null> {
  const supabase = createUntypedServiceClient()

  const { data, error } = await supabase
    .from('meetings')
    .select(MEETING_COLUMNS)
    .eq('id', id)
    .eq('organization_id', orgId)
    .is('deleted_at', null)
    .maybeSingle()

  if (error || !data) return null

  const meeting = data as MeetingRow
  if (meeting.created_by === userId) return meeting
  if (meeting.visibility === 'org_wide') return meeting

  // Check attendee list
  const { data: attendee } = await supabase
    .from('meeting_attendees')
    .select('user_id')
    .eq('meeting_id', id)
    .eq('user_id', userId)
    .maybeSingle()

  return attendee ? meeting : null
}

/**
 * Returns meetings linked to a project that the given user can access.
 * Used by the project Meetings tab.
 */
export async function getMeetingsForProject(
  projectId: string,
  orgId: string,
  userId: string,
): Promise<Array<MeetingRow & { relevant_summary: string | null }>> {
  const supabase = createUntypedServiceClient()

  // Get all links for this project
  const { data: links, error: linksError } = await supabase
    .from('meeting_project_links')
    .select('meeting_id, relevant_summary')
    .eq('project_id', projectId)

  if (linksError || !links || links.length === 0) return []

  const meetingIds = (links as Array<{ meeting_id: string; relevant_summary: string | null }>).map(
    (l) => l.meeting_id,
  )

  // Fetch those meetings scoped to the org
  const { data: meetings, error: meetingsError } = await supabase
    .from('meetings')
    .select(MEETING_COLUMNS)
    .in('id', meetingIds)
    .eq('organization_id', orgId)
    .is('deleted_at', null)

  if (meetingsError || !meetings) return []

  // Filter to meetings the user can actually see
  const { data: attendeeRows } = await supabase
    .from('meeting_attendees')
    .select('meeting_id')
    .in('meeting_id', meetingIds)
    .eq('user_id', userId)

  const attendedIds = new Set(
    (attendeeRows ?? []).map((r: { meeting_id: string }) => r.meeting_id),
  )

  const linkSummaryMap = new Map(
    (links as Array<{ meeting_id: string; relevant_summary: string | null }>).map((l) => [
      l.meeting_id,
      l.relevant_summary,
    ]),
  )

  return (meetings as MeetingRow[])
    .filter((m) => {
      if (m.created_by === userId) return true
      if (m.visibility === 'org_wide') return true
      return attendedIds.has(m.id)
    })
    .map((m) => ({
      ...m,
      relevant_summary: linkSummaryMap.get(m.id) ?? null,
    }))
    .sort((a, b) => {
      if (a.meeting_date && b.meeting_date) return b.meeting_date.localeCompare(a.meeting_date)
      return b.created_at.localeCompare(a.created_at)
    })
}

/**
 * Returns attendees for a meeting with their profile information.
 */
export async function getAttendeesForMeeting(meetingId: string): Promise<MeetingAttendee[]> {
  const supabase = createUntypedServiceClient()

  const { data, error } = await supabase
    .from('meeting_attendees')
    .select('meeting_id, user_id, added_by, added_at')
    .eq('meeting_id', meetingId)

  if (error || !data) return []

  const attendeeRows = data as Array<{
    meeting_id: string
    user_id: string
    added_by: string
    added_at: string
  }>

  if (attendeeRows.length === 0) return []

  const userIds = attendeeRows.map((r) => r.user_id)
  const { data: profiles } = await supabase
    .from('user_profiles')
    .select('user_id, full_name, avatar_url')
    .in('user_id', userIds)

  const profileMap = new Map(
    (profiles ?? []).map((p: { user_id: string; full_name: string | null; avatar_url: string | null }) => [
      p.user_id,
      { full_name: p.full_name, avatar_url: p.avatar_url },
    ]),
  )

  return attendeeRows.map((r) => ({
    ...r,
    full_name: profileMap.get(r.user_id)?.full_name ?? null,
    avatar_url: profileMap.get(r.user_id)?.avatar_url ?? null,
  }))
}

// -------------------------------------------------------
// Mutations
// -------------------------------------------------------

/**
 * Creates a new meeting and adds the creator as an attendee.
 */
export async function createMeeting(params: {
  organizationId: string
  createdBy: string
  title: string
  meetingDate: string | null
  rawTranscript: string
  visibility: 'attendees_only' | 'org_wide'
  attendeeUserIds: string[]
}): Promise<{ meeting: MeetingRow | null; error: string | null }> {
  const supabase = createUntypedServiceClient()

  const { data, error } = await supabase
    .from('meetings')
    .insert({
      organization_id: params.organizationId,
      created_by: params.createdBy,
      title: params.title,
      meeting_date: params.meetingDate,
      raw_transcript: params.rawTranscript,
      visibility: params.visibility,
    })
    .select(MEETING_COLUMNS)
    .single()

  if (error || !data) {
    console.error('[meetings] Create error:', error)
    return { meeting: null, error: 'Failed to create meeting' }
  }

  const meeting = data as MeetingRow

  // Add attendees (always includes creator, plus any additional)
  const allAttendeeIds = Array.from(
    new Set([params.createdBy, ...params.attendeeUserIds]),
  )

  const { error: attendeeError } = await supabase.from('meeting_attendees').insert(
    allAttendeeIds.map((userId) => ({
      meeting_id: meeting.id,
      user_id: userId,
      added_by: params.createdBy,
    })),
  )

  if (attendeeError) {
    console.error('[meetings] Attendee insert error:', attendeeError)
  }

  return { meeting, error: null }
}

/**
 * Updates AI-processed output fields on a meeting.
 */
export async function saveMeetingProcessingResult(params: {
  meetingId: string
  orgId: string
  processedSummary: string
  extractedDecisions: ExtractedDecision[]
  extractedActionItems: ExtractedActionItem[]
  extractedOpenQuestions: ExtractedQuestion[]
  suggestedProjectLinks: SuggestedProjectLink[]
}): Promise<{ error: string | null }> {
  const supabase = createUntypedServiceClient()

  const { error } = await supabase
    .from('meetings')
    .update({
      processed_summary: params.processedSummary,
      extracted_decisions: params.extractedDecisions,
      extracted_action_items: params.extractedActionItems,
      extracted_open_questions: params.extractedOpenQuestions,
      suggested_project_links: params.suggestedProjectLinks,
      processed_at: new Date().toISOString(),
    })
    .eq('id', params.meetingId)
    .eq('organization_id', params.orgId)

  if (error) {
    console.error('[meetings] Save processing result error:', error)
    return { error: 'Failed to save processing result' }
  }

  return { error: null }
}

/**
 * Accepts routing suggestions: creates meeting_project_links for accepted projects
 * and marks the meeting as accepted.
 */
export async function acceptMeetingRoutingSuggestions(params: {
  meetingId: string
  orgId: string
  userId: string
  acceptedProjectLinks: Array<{
    projectId: string
    relevantSummary: string
  }>
}): Promise<{ error: string | null }> {
  const hasAccess = await canUserAccessMeeting(params.meetingId, params.orgId, params.userId)
  if (!hasAccess) return { error: 'Not found' }

  const supabase = createUntypedServiceClient()

  const { error: delError } = await supabase
    .from('meeting_project_links')
    .delete()
    .eq('meeting_id', params.meetingId)

  if (delError) {
    console.error('[meetings] Link delete error:', delError)
    return { error: 'Failed to update project links' }
  }

  if (params.acceptedProjectLinks.length > 0) {
    const { error: linkError } = await supabase.from('meeting_project_links').insert(
      params.acceptedProjectLinks.map((link) => ({
        meeting_id: params.meetingId,
        project_id: link.projectId,
        relevant_summary: link.relevantSummary,
        linked_by: params.userId,
      })),
    )

    if (linkError) {
      console.error('[meetings] Link insert error:', linkError)
      return { error: 'Failed to link projects' }
    }
  }

  const { error: acceptError } = await supabase
    .from('meetings')
    .update({ accepted_at: new Date().toISOString() })
    .eq('id', params.meetingId)
    .eq('organization_id', params.orgId)

  if (acceptError) {
    console.error('[meetings] Accept update error:', acceptError)
    return { error: 'Failed to mark meeting as accepted' }
  }

  return { error: null }
}

/**
 * Soft-deletes a meeting.
 */
export async function softDeleteMeeting(
  id: string,
  orgId: string,
  userId: string,
): Promise<{ error: string | null }> {
  const supabase = createUntypedServiceClient()

  const { error } = await supabase
    .from('meetings')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id)
    .eq('organization_id', orgId)
    .eq('created_by', userId)

  if (error) {
    console.error('[meetings] Soft delete error:', error)
    return { error: 'Failed to delete meeting' }
  }

  return { error: null }
}
