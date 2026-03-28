import { createServiceClient } from '@/lib/supabase/service'

// -------------------------------------------------------
// Types
// -------------------------------------------------------

export type DiscussionParentType = 'project' | 'document' | 'section'
export type DiscussionMode = 'lightweight' | 'structured'
export type DiscussionStatus = 'active' | 'resolved'

export interface DiscussionRow {
  id: string
  organization_id: string
  parent_type: DiscussionParentType
  parent_id: string
  section_key: string | null
  mode: DiscussionMode
  title: string
  status: DiscussionStatus
  created_by: string
  created_at: string
  updated_at: string
  resolved_at: string | null
  resolved_by: string | null
  ai_summary: string | null
}

export interface DiscussionMessageRow {
  id: string
  discussion_id: string
  user_id: string
  content: string
  message_type: 'user' | 'system'
  created_at: string
  updated_at: string
}

export interface DiscussionDecisionRow {
  id: string
  discussion_id: string
  text: string
  sort_order: number
  created_at: string
}

export interface DiscussionLearningRow {
  id: string
  discussion_id: string
  text: string
  sort_order: number
  created_at: string
}

export interface DiscussionNextStepRow {
  id: string
  discussion_id: string
  text: string
  owner_id: string | null
  status: 'open' | 'done'
  sort_order: number
  created_at: string
}

export interface DiscussionDocumentLinkRow {
  id: string
  discussion_id: string
  document_id: string
  relationship_type: 'created_from' | 'references'
  created_at: string
}

export interface DiscussionResolutionData {
  decisions: DiscussionDecisionRow[]
  learnings: DiscussionLearningRow[]
  nextSteps: DiscussionNextStepRow[]
}

const DISCUSSION_SELECT =
  'id, organization_id, parent_type, parent_id, section_key, mode, title, status, created_by, created_at, updated_at, resolved_at, resolved_by, ai_summary'

// -------------------------------------------------------
// Discussions CRUD
// -------------------------------------------------------

export async function createDiscussion(input: {
  organizationId: string
  userId: string
  parentType: DiscussionParentType
  parentId: string
  sectionKey?: string
  mode: DiscussionMode
  title: string
}): Promise<{ discussion: DiscussionRow | null; error: string | null }> {
  const supabase = createServiceClient()
  const { data, error } = await supabase
    .from('discussions')
    .insert({
      organization_id: input.organizationId,
      created_by: input.userId,
      parent_type: input.parentType,
      parent_id: input.parentId,
      section_key: input.sectionKey ?? null,
      mode: input.mode,
      title: input.title,
    })
    .select(DISCUSSION_SELECT)
    .single()
  if (error) return { discussion: null, error: 'Failed to create discussion' }
  return { discussion: data as DiscussionRow, error: null }
}

export async function getDiscussionById(
  id: string,
  organizationId: string,
): Promise<DiscussionRow | null> {
  const supabase = createServiceClient()
  const { data, error } = await supabase
    .from('discussions')
    .select(DISCUSSION_SELECT)
    .eq('id', id)
    .eq('organization_id', organizationId)
    .maybeSingle()
  if (error || !data) return null
  return data as DiscussionRow
}

export async function getDiscussionsForParent(
  parentType: DiscussionParentType,
  parentId: string,
  organizationId: string,
  options?: { status?: DiscussionStatus | 'all'; sectionKey?: string },
): Promise<DiscussionRow[]> {
  const supabase = createServiceClient()
  let query = supabase
    .from('discussions')
    .select(DISCUSSION_SELECT)
    .eq('organization_id', organizationId)
    .eq('parent_type', parentType)
    .eq('parent_id', parentId)
    .order('updated_at', { ascending: false })

  if (options?.status && options.status !== 'all') {
    query = query.eq('status', options.status)
  }
  if (options?.sectionKey) {
    query = query.eq('section_key', options.sectionKey)
  }

  const { data, error } = await query
  if (error) return []
  return data as DiscussionRow[]
}

export async function updateDiscussion(
  id: string,
  organizationId: string,
  updates: Partial<Pick<DiscussionRow, 'title' | 'mode' | 'status'>>,
): Promise<{ discussion: DiscussionRow | null; error: string | null }> {
  const supabase = createServiceClient()
  const { data, error } = await supabase
    .from('discussions')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .eq('organization_id', organizationId)
    .select(DISCUSSION_SELECT)
    .single()
  if (error) return { discussion: null, error: 'Failed to update discussion' }
  return { discussion: data as DiscussionRow, error: null }
}

// -------------------------------------------------------
// Messages
// -------------------------------------------------------

export async function createDiscussionMessage(input: {
  discussionId: string
  userId: string
  content: string
  messageType?: 'user' | 'system'
}): Promise<{ message: DiscussionMessageRow | null; error: string | null }> {
  const supabase = createServiceClient()
  const { data, error } = await supabase
    .from('discussion_messages')
    .insert({
      discussion_id: input.discussionId,
      user_id: input.userId,
      content: input.content,
      message_type: input.messageType ?? 'user',
    })
    .select('id, discussion_id, user_id, content, message_type, created_at, updated_at')
    .single()
  if (error) return { message: null, error: 'Failed to send message' }
  await supabase
    .from('discussions')
    .update({ updated_at: new Date().toISOString() })
    .eq('id', input.discussionId)
  return { message: data as DiscussionMessageRow, error: null }
}

export async function getDiscussionMessages(
  discussionId: string,
  organizationId: string,
): Promise<DiscussionMessageRow[]> {
  const discussion = await getDiscussionById(discussionId, organizationId)
  if (!discussion) return []

  const supabase = createServiceClient()
  const { data, error } = await supabase
    .from('discussion_messages')
    .select('id, discussion_id, user_id, content, message_type, created_at, updated_at')
    .eq('discussion_id', discussionId)
    .is('deleted_at', null)
    .order('created_at', { ascending: true })
  if (error) return []
  return data as DiscussionMessageRow[]
}

// -------------------------------------------------------
// Resolution
// -------------------------------------------------------

export async function resolveDiscussion(input: {
  id: string
  organizationId: string
  resolvedBy: string
  aiSummary: string
  decisions: string[]
  learnings: string[]
  nextSteps: Array<{ text: string; ownerId?: string }>
}): Promise<{ discussion: DiscussionRow | null; error: string | null }> {
  const supabase = createServiceClient()

  const { data, error } = await supabase
    .from('discussions')
    .update({
      status: 'resolved',
      resolved_at: new Date().toISOString(),
      resolved_by: input.resolvedBy,
      ai_summary: input.aiSummary,
      updated_at: new Date().toISOString(),
    })
    .eq('id', input.id)
    .eq('organization_id', input.organizationId)
    .select(DISCUSSION_SELECT)
    .single()

  if (error || !data) return { discussion: null, error: 'Failed to resolve discussion' }

  if (input.decisions.length > 0) {
    await supabase.from('discussion_decisions').insert(
      input.decisions.map((text, i) => ({
        discussion_id: input.id,
        text,
        sort_order: i,
      })),
    )
  }

  if (input.learnings.length > 0) {
    await supabase.from('discussion_learnings').insert(
      input.learnings.map((text, i) => ({
        discussion_id: input.id,
        text,
        sort_order: i,
      })),
    )
  }

  if (input.nextSteps.length > 0) {
    await supabase.from('discussion_next_steps').insert(
      input.nextSteps.map((step, i) => ({
        discussion_id: input.id,
        text: step.text,
        owner_id: step.ownerId ?? null,
        sort_order: i,
      })),
    )
  }

  return { discussion: data as DiscussionRow, error: null }
}

export async function getDiscussionResolution(
  discussionId: string,
  organizationId: string,
): Promise<DiscussionResolutionData | null> {
  const discussion = await getDiscussionById(discussionId, organizationId)
  if (!discussion) return null

  const supabase = createServiceClient()
  const [decisionsRes, learningsRes, nextStepsRes] = await Promise.all([
    supabase
      .from('discussion_decisions')
      .select('id, discussion_id, text, sort_order, created_at')
      .eq('discussion_id', discussionId)
      .order('sort_order'),
    supabase
      .from('discussion_learnings')
      .select('id, discussion_id, text, sort_order, created_at')
      .eq('discussion_id', discussionId)
      .order('sort_order'),
    supabase
      .from('discussion_next_steps')
      .select('id, discussion_id, text, owner_id, status, sort_order, created_at')
      .eq('discussion_id', discussionId)
      .order('sort_order'),
  ])

  return {
    decisions: (decisionsRes.data ?? []) as DiscussionDecisionRow[],
    learnings: (learningsRes.data ?? []) as DiscussionLearningRow[],
    nextSteps: (nextStepsRes.data ?? []) as DiscussionNextStepRow[],
  }
}

// -------------------------------------------------------
// Document links
// -------------------------------------------------------

export async function createDiscussionDocumentLink(input: {
  discussionId: string
  documentId: string
  relationshipType: 'created_from' | 'references'
}): Promise<void> {
  const supabase = createServiceClient()
  await supabase.from('discussion_document_links').upsert(
    {
      discussion_id: input.discussionId,
      document_id: input.documentId,
      relationship_type: input.relationshipType,
    },
    { onConflict: 'discussion_id,document_id' },
  )
}

export async function getDiscussionDocumentLinks(
  discussionId: string,
  organizationId: string,
): Promise<DiscussionDocumentLinkRow[]> {
  const discussion = await getDiscussionById(discussionId, organizationId)
  if (!discussion) return []

  const supabase = createServiceClient()
  const { data, error } = await supabase
    .from('discussion_document_links')
    .select('id, discussion_id, document_id, relationship_type, created_at')
    .eq('discussion_id', discussionId)
    .order('created_at')
  if (error) return []
  return data as DiscussionDocumentLinkRow[]
}
