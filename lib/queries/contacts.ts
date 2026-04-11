import { createUntypedServiceClient } from '@/lib/supabase/service'
import { normalizeContactLabel, normalizeTagList } from '@/lib/contact-labels'

export type ContactSegment = 'beta_user' | 'free_user' | 'customer' | 'power_user' | 'prospect' | 'churned' | 'other'
export type ContactStatus = 'active' | 'inactive' | 'archived'
export type ContactHealth = 'green' | 'yellow' | 'red'
export type FunnelStage = 'signup' | 'form_completed' | 'downloaded' | 'first_session' | 'activated'

export const FUNNEL_STAGE_ORDER: Record<FunnelStage, number> = {
  signup: 1,
  form_completed: 2,
  downloaded: 3,
  first_session: 4,
  activated: 5,
}

export interface ContactRow {
  id: string
  organization_id: string
  created_by: string
  name: string
  email: string | null
  company: string | null
  role: string | null
  segment: ContactSegment | null
  status: ContactStatus
  health: ContactHealth | null
  tags: string[]
  notes: string | null
  last_contacted_at: string | null
  created_at: string
  updated_at: string
  deleted_at: string | null
  persona_id: string | null
  persona_match_score: number | null
  persona_match_reasoning: string | null
  persona_matched_at: string | null
  funnel_stage: FunnelStage | null
  acquisition_source: string | null
  funnel_stage_updated_at: string | null
  first_session_at: string | null
  activated_at: string | null
  tally_submission_id: string | null
  loops_contact_id: string | null
}

const SELECT_COLUMNS =
  'id, organization_id, created_by, name, email, company, role, segment, status, health, tags, notes, last_contacted_at, created_at, updated_at, deleted_at, persona_id, persona_match_score, persona_match_reasoning, persona_matched_at, funnel_stage, acquisition_source, funnel_stage_updated_at, first_session_at, activated_at, tally_submission_id, loops_contact_id'

export async function getContactsForOrg(orgId: string): Promise<ContactRow[]> {
  const supabase = createUntypedServiceClient()
  const { data, error } = await supabase
    .from('contacts')
    .select(SELECT_COLUMNS)
    .eq('organization_id', orgId)
    .is('deleted_at', null)
    .order('name', { ascending: true })

  if (error || !data) return []
  return data as unknown as ContactRow[]
}

export async function getContactById(id: string, orgId: string): Promise<ContactRow | null> {
  const supabase = createUntypedServiceClient()
  const { data, error } = await supabase
    .from('contacts')
    .select(SELECT_COLUMNS)
    .eq('id', id)
    .eq('organization_id', orgId)
    .is('deleted_at', null)
    .maybeSingle()

  if (error || !data) return null
  return data as unknown as ContactRow
}

export async function createContact(params: {
  organizationId: string
  userId: string
  name: string
  email?: string | null
  company?: string | null
  role?: string | null
  segment?: ContactSegment | null
  health?: ContactHealth | null
  tags?: string[]
  notes?: string | null
  funnel_stage?: FunnelStage | null
  acquisition_source?: string | null
  tally_submission_id?: string | null
  loops_contact_id?: string | null
  first_session_at?: string | null
  activated_at?: string | null
}): Promise<{ contact: ContactRow | null; error: string | null }> {
  const supabase = createUntypedServiceClient()
  const now = new Date().toISOString()
  const tags = normalizeTagList(params.tags ?? [])
  const acquisitionSource = params.acquisition_source
    ? normalizeContactLabel(params.acquisition_source)
    : null

  const { data, error } = await supabase
    .from('contacts')
    .insert({
      organization_id: params.organizationId,
      created_by: params.userId,
      name: params.name,
      email: params.email ?? null,
      company: params.company ?? null,
      role: params.role ?? null,
      segment: params.segment ?? null,
      health: params.health ?? null,
      tags,
      notes: params.notes ?? null,
      funnel_stage: params.funnel_stage ?? null,
      acquisition_source: acquisitionSource || null,
      funnel_stage_updated_at: params.funnel_stage ? now : null,
      tally_submission_id: params.tally_submission_id ?? null,
      loops_contact_id: params.loops_contact_id ?? null,
      first_session_at: params.first_session_at ?? null,
      activated_at: params.activated_at ?? null,
    })
    .select(SELECT_COLUMNS)
    .single()

  if (error || !data) return { contact: null, error: 'Failed to create contact' }
  return { contact: data as unknown as ContactRow, error: null }
}

export async function updateContact(
  id: string,
  orgId: string,
  updates: Partial<Omit<ContactRow, 'id' | 'organization_id' | 'created_by' | 'created_at' | 'updated_at' | 'deleted_at'>>,
): Promise<{ contact: ContactRow | null; error: string | null }> {
  const supabase = createUntypedServiceClient()
  const now = new Date().toISOString()
  const normalized: typeof updates = { ...updates }
  if (updates.tags !== undefined) normalized.tags = normalizeTagList(updates.tags)
  if (updates.acquisition_source !== undefined) {
    normalized.acquisition_source = updates.acquisition_source
      ? normalizeContactLabel(updates.acquisition_source)
      : null
  }
  const finalUpdates = {
    ...normalized,
    updated_at: now,
    ...(updates.funnel_stage !== undefined ? { funnel_stage_updated_at: now } : {}),
  }
  const { data, error } = await supabase
    .from('contacts')
    .update(finalUpdates)
    .eq('id', id)
    .eq('organization_id', orgId)
    .is('deleted_at', null)
    .select(SELECT_COLUMNS)
    .single()

  if (error || !data) return { contact: null, error: 'Failed to update contact' }
  return { contact: data as unknown as ContactRow, error: null }
}

/**
 * Find an existing contact by email and org, then update it with the provided fields.
 * If no contact exists, create a new one. Funnel stage only advances — it never regresses.
 * Used by webhook handlers (Tally, Loops, app events).
 */
export async function upsertContactByEmail(
  email: string,
  orgId: string,
  userId: string,
  fields: {
    name?: string
    funnel_stage?: FunnelStage | null
    acquisition_source?: string | null
    tally_submission_id?: string | null
    loops_contact_id?: string | null
    segment?: ContactSegment | null
    tags?: string[]
    notes?: string | null
    first_session_at?: string | null
    activated_at?: string | null
    health?: ContactHealth | null
  },
): Promise<{ contact: ContactRow | null; created: boolean; error: string | null }> {
  const supabase = createUntypedServiceClient()

  const { data: existing, error: lookupError } = await supabase
    .from('contacts')
    .select(SELECT_COLUMNS)
    .eq('organization_id', orgId)
    .eq('email', email)
    .is('deleted_at', null)
    .maybeSingle()

  if (lookupError) return { contact: null, created: false, error: 'Lookup failed' }

  if (!existing) {
    const { contact, error } = await createContact({
      organizationId: orgId,
      userId,
      name: fields.name ?? email,
      email,
      segment: fields.segment ?? null,
      health: fields.health ?? null,
      tags: fields.tags ?? [],
      notes: fields.notes ?? null,
      funnel_stage: fields.funnel_stage ?? null,
      acquisition_source: fields.acquisition_source ?? null,
      tally_submission_id: fields.tally_submission_id ?? null,
      loops_contact_id: fields.loops_contact_id ?? null,
      first_session_at: fields.first_session_at ?? null,
      activated_at: fields.activated_at ?? null,
    })
    return { contact, created: true, error }
  }

  const existingContact = existing as unknown as ContactRow

  // Only advance funnel stage — never move it backward
  const existingOrder = existingContact.funnel_stage
    ? FUNNEL_STAGE_ORDER[existingContact.funnel_stage]
    : 0
  const newOrder = fields.funnel_stage ? FUNNEL_STAGE_ORDER[fields.funnel_stage] : 0
  const shouldAdvanceStage = newOrder > existingOrder

  const updates: Partial<Omit<ContactRow, 'id' | 'organization_id' | 'created_by' | 'created_at' | 'updated_at' | 'deleted_at'>> = {}

  if (shouldAdvanceStage && fields.funnel_stage) updates.funnel_stage = fields.funnel_stage
  if (fields.acquisition_source && !existingContact.acquisition_source) {
    updates.acquisition_source = normalizeContactLabel(fields.acquisition_source)
  }
  if (fields.tally_submission_id && !existingContact.tally_submission_id) updates.tally_submission_id = fields.tally_submission_id
  if (fields.loops_contact_id && !existingContact.loops_contact_id) updates.loops_contact_id = fields.loops_contact_id
  if (fields.first_session_at && !existingContact.first_session_at) updates.first_session_at = fields.first_session_at
  if (fields.activated_at && !existingContact.activated_at) updates.activated_at = fields.activated_at
  if (fields.health && !existingContact.health) updates.health = fields.health

  if (Object.keys(updates).length === 0) {
    return { contact: existingContact, created: false, error: null }
  }

  const { contact, error } = await updateContact(existingContact.id, orgId, updates)
  return { contact, created: false, error }
}

export async function getPersonaMatchStats(
  orgId: string,
): Promise<Array<{ persona_id: string; count: number; avg_score: number }>> {
  const supabase = createUntypedServiceClient()
  const { data, error } = await supabase
    .from('contacts')
    .select('persona_id, persona_match_score')
    .eq('organization_id', orgId)
    .is('deleted_at', null)
    .not('persona_id', 'is', null)

  if (error || !data) return []

  const stats: Record<string, { count: number; totalScore: number }> = {}
  for (const row of data as Array<{ persona_id: string | null; persona_match_score: number | null }>) {
    if (!row.persona_id) continue
    const s = stats[row.persona_id] ?? { count: 0, totalScore: 0 }
    s.count += 1
    s.totalScore += row.persona_match_score ?? 0
    stats[row.persona_id] = s
  }

  return Object.entries(stats).map(([persona_id, { count, totalScore }]) => ({
    persona_id,
    count,
    avg_score: count > 0 ? Math.round(totalScore / count) : 0,
  }))
}

export async function deleteContact(
  id: string,
  orgId: string,
): Promise<{ error: string | null }> {
  const supabase = createUntypedServiceClient()
  const { error } = await supabase
    .from('contacts')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id)
    .eq('organization_id', orgId)

  if (error) return { error: 'Failed to delete contact' }
  return { error: null }
}
