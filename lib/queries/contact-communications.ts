import { createUntypedServiceClient } from '@/lib/supabase/service'

export type CommunicationDirection = 'inbound' | 'outbound' | 'internal_note'
export type CommunicationChannel = 'email' | 'call' | 'meeting' | 'chat' | 'sms' | 'other'
export type CommunicationSentiment = 'positive' | 'neutral' | 'negative' | 'mixed'

export interface ContactCommunicationRow {
  id: string
  organization_id: string
  contact_id: string
  created_by: string
  direction: CommunicationDirection
  channel: CommunicationChannel
  subject: string | null
  content: string
  sent_at: string | null
  is_draft: boolean
  sentiment: CommunicationSentiment | null
  tags: string[]
  created_at: string
  updated_at: string
  deleted_at: string | null
  contact_name: string | null
}

const SELECT_COLUMNS =
  'id, organization_id, contact_id, created_by, direction, channel, subject, content, sent_at, is_draft, sentiment, tags, created_at, updated_at, deleted_at, contacts(name)'

function mapRow(row: Record<string, unknown>): ContactCommunicationRow {
  return {
    id: row.id as string,
    organization_id: row.organization_id as string,
    contact_id: row.contact_id as string,
    created_by: row.created_by as string,
    direction: row.direction as CommunicationDirection,
    channel: row.channel as CommunicationChannel,
    subject: (row.subject as string | null) ?? null,
    content: row.content as string,
    sent_at: (row.sent_at as string | null) ?? null,
    is_draft: row.is_draft as boolean,
    sentiment: (row.sentiment as CommunicationSentiment | null) ?? null,
    tags: (row.tags as string[]) ?? [],
    created_at: row.created_at as string,
    updated_at: row.updated_at as string,
    deleted_at: (row.deleted_at as string | null) ?? null,
    contact_name: (row.contacts as { name?: string } | null)?.name ?? null,
  }
}

export async function getCommunicationsForContact(
  contactId: string,
  orgId: string,
): Promise<ContactCommunicationRow[]> {
  const supabase = createUntypedServiceClient()
  const { data, error } = await supabase
    .from('contact_communications')
    .select(SELECT_COLUMNS)
    .eq('contact_id', contactId)
    .eq('organization_id', orgId)
    .is('deleted_at', null)
    .order('sent_at', { ascending: false, nullsFirst: false })
    .order('created_at', { ascending: false })

  if (error || !data) return []
  return (data as unknown as Record<string, unknown>[]).map(mapRow)
}

export async function getRecentCommunicationsForOrg(
  orgId: string,
  limit = 100,
): Promise<ContactCommunicationRow[]> {
  const supabase = createUntypedServiceClient()
  const { data, error } = await supabase
    .from('contact_communications')
    .select(SELECT_COLUMNS)
    .eq('organization_id', orgId)
    .is('deleted_at', null)
    .order('sent_at', { ascending: false, nullsFirst: false })
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error || !data) return []
  return (data as unknown as Record<string, unknown>[]).map(mapRow)
}

export async function createCommunication(params: {
  organizationId: string
  contactId: string
  userId: string
  direction: CommunicationDirection
  channel: CommunicationChannel
  subject?: string | null
  content: string
  sent_at?: string | null
  is_draft?: boolean
  sentiment?: CommunicationSentiment | null
  tags?: string[]
}): Promise<{ communication: ContactCommunicationRow | null; error: string | null }> {
  const supabase = createUntypedServiceClient()
  const { data, error } = await supabase
    .from('contact_communications')
    .insert({
      organization_id: params.organizationId,
      contact_id: params.contactId,
      created_by: params.userId,
      direction: params.direction,
      channel: params.channel,
      subject: params.subject ?? null,
      content: params.content,
      sent_at: params.sent_at ?? null,
      is_draft: params.is_draft ?? false,
      sentiment: params.sentiment ?? null,
      tags: params.tags ?? [],
    })
    .select(SELECT_COLUMNS)
    .single()

  if (error || !data) return { communication: null, error: 'Failed to create communication' }
  return { communication: mapRow(data as unknown as Record<string, unknown>), error: null }
}

export async function updateCommunication(
  id: string,
  orgId: string,
  updates: Partial<Omit<ContactCommunicationRow, 'id' | 'organization_id' | 'contact_id' | 'created_by' | 'created_at' | 'updated_at' | 'deleted_at' | 'contact_name'>>,
): Promise<{ communication: ContactCommunicationRow | null; error: string | null }> {
  const supabase = createUntypedServiceClient()
  const { data, error } = await supabase
    .from('contact_communications')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .eq('organization_id', orgId)
    .is('deleted_at', null)
    .select(SELECT_COLUMNS)
    .single()

  if (error || !data) return { communication: null, error: 'Failed to update communication' }
  return { communication: mapRow(data as unknown as Record<string, unknown>), error: null }
}

export async function deleteCommunication(
  id: string,
  orgId: string,
): Promise<{ error: string | null }> {
  const supabase = createUntypedServiceClient()
  const { error } = await supabase
    .from('contact_communications')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id)
    .eq('organization_id', orgId)

  if (error) return { error: 'Failed to delete communication' }
  return { error: null }
}
