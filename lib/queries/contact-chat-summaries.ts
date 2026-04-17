import { createUntypedServiceClient } from '@/lib/supabase/service'

export interface ContactChatSummaryRow {
  id: string
  organization_id: string
  session_id: string
  contact_id: string | null
  segment: string | null
  title: string
  content: string
  created_by: string
  created_at: string
  updated_at: string
}

const SELECT_COLUMNS =
  'id, organization_id, session_id, contact_id, segment, title, content, created_by, created_at, updated_at'

function mapRow(row: Record<string, unknown>): ContactChatSummaryRow {
  return {
    id: row.id as string,
    organization_id: row.organization_id as string,
    session_id: row.session_id as string,
    contact_id: (row.contact_id as string | null) ?? null,
    segment: (row.segment as string | null) ?? null,
    title: row.title as string,
    content: row.content as string,
    created_by: row.created_by as string,
    created_at: row.created_at as string,
    updated_at: row.updated_at as string,
  }
}

export async function getContactChatSummaryForSession(
  sessionId: string,
  orgId: string,
): Promise<ContactChatSummaryRow | null> {
  const supabase = createUntypedServiceClient()
  const { data, error } = await supabase
    .from('contact_chat_summaries')
    .select(SELECT_COLUMNS)
    .eq('session_id', sessionId)
    .eq('organization_id', orgId)
    .maybeSingle()

  if (error || !data) return null
  return mapRow(data as unknown as Record<string, unknown>)
}

export async function upsertContactChatSummary(params: {
  organizationId: string
  sessionId: string
  contactId: string | null
  segment: string | null
  title: string
  content: string
  createdBy: string
}): Promise<{ summary: ContactChatSummaryRow | null; error: string | null }> {
  const supabase = createUntypedServiceClient()

  const { data, error } = await supabase
    .from('contact_chat_summaries')
    .upsert(
      {
        organization_id: params.organizationId,
        session_id: params.sessionId,
        contact_id: params.contactId,
        segment: params.segment,
        title: params.title,
        content: params.content,
        created_by: params.createdBy,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'session_id' },
    )
    .select(SELECT_COLUMNS)
    .single()

  if (error || !data) return { summary: null, error: 'Failed to save summary' }
  return { summary: mapRow(data as unknown as Record<string, unknown>), error: null }
}
