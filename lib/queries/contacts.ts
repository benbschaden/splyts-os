import { createUntypedServiceClient } from '@/lib/supabase/service'

export type ContactSegment = 'beta_user' | 'free_user' | 'customer' | 'power_user' | 'prospect' | 'churned' | 'other'
export type ContactStatus = 'active' | 'inactive' | 'archived'
export type ContactHealth = 'green' | 'yellow' | 'red'

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
}

const SELECT_COLUMNS =
  'id, organization_id, created_by, name, email, company, role, segment, status, health, tags, notes, last_contacted_at, created_at, updated_at, deleted_at, persona_id, persona_match_score, persona_match_reasoning, persona_matched_at'

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
}): Promise<{ contact: ContactRow | null; error: string | null }> {
  const supabase = createUntypedServiceClient()
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
      tags: params.tags ?? [],
      notes: params.notes ?? null,
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
  const { data, error } = await supabase
    .from('contacts')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .eq('organization_id', orgId)
    .is('deleted_at', null)
    .select(SELECT_COLUMNS)
    .single()

  if (error || !data) return { contact: null, error: 'Failed to update contact' }
  return { contact: data as unknown as ContactRow, error: null }
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
