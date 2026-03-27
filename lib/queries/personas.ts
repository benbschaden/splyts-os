import { createServiceClient } from '@/lib/supabase/service'

const PERSONA_SELECT =
  'id, name, tagline, age_range, job_title, industry, company_size, location, goals, frustrations, motivations, behaviors, values, channels, buying_triggers, objections, quote, include_in_ai, created_at, updated_at'

export interface PersonaData {
  name: string
  tagline: string | null
  age_range: string | null
  job_title: string | null
  industry: string | null
  company_size: string | null
  location: string | null
  goals: string | null
  frustrations: string | null
  motivations: string | null
  behaviors: string | null
  values: string | null
  channels: string | null
  buying_triggers: string | null
  objections: string | null
  quote: string | null
  include_in_ai: boolean
}

export type PersonaRow = PersonaData & {
  id: string
  created_at: string
  updated_at: string
}

export async function getPersonas(organizationId: string): Promise<PersonaRow[]> {
  const supabase = createServiceClient()

  const { data, error } = await supabase
    .from('personas')
    .select(PERSONA_SELECT)
    .eq('organization_id', organizationId)
    .is('deleted_at', null)
    .order('created_at', { ascending: true })

  if (error) return []
  return data as PersonaRow[]
}

export async function getPersonaById(id: string, organizationId: string): Promise<PersonaRow | null> {
  const supabase = createServiceClient()

  const { data, error } = await supabase
    .from('personas')
    .select(PERSONA_SELECT)
    .eq('id', id)
    .eq('organization_id', organizationId)
    .is('deleted_at', null)
    .maybeSingle()

  if (error || !data) return null
  return data as PersonaRow
}

export async function createPersona(
  input: PersonaData,
  organizationId: string,
  userId: string,
) {
  const supabase = createServiceClient()

  const { data, error } = await supabase
    .from('personas')
    .insert({ ...input, organization_id: organizationId, created_by: userId })
    .select(PERSONA_SELECT)
    .single()

  if (error) return { persona: null, error: 'Failed to create persona' }
  return { persona: data as PersonaRow, error: null }
}

export async function updatePersona(
  id: string,
  organizationId: string,
  updates: Partial<PersonaData>,
) {
  const supabase = createServiceClient()

  const { data, error } = await supabase
    .from('personas')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .eq('organization_id', organizationId)
    .is('deleted_at', null)
    .select(PERSONA_SELECT)
    .single()

  if (error) return { persona: null, error: 'Failed to update persona' }
  return { persona: data as PersonaRow, error: null }
}

export async function deletePersona(id: string, organizationId: string) {
  const supabase = createServiceClient()

  const { error } = await supabase
    .from('personas')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id)
    .eq('organization_id', organizationId)

  if (error) return { error: 'Failed to delete persona' }
  return { error: null }
}
