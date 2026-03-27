import { createServiceClient } from '@/lib/supabase/service'

export type KpiDefinitionRow = {
  id: string
  organization_id: string
  name: string
  unit: string
  category: string
  description: string | null
  is_highlighted: boolean
  sort_order: number
  created_by: string
  updated_by: string | null
  created_at: string
  updated_at: string
  deleted_at: string | null
}

const SELECT_COLUMNS =
  'id, organization_id, name, unit, category, description, is_highlighted, sort_order, created_by, updated_by, created_at, updated_at, deleted_at'

export async function getKpiDefinitions(organizationId: string): Promise<KpiDefinitionRow[]> {
  const supabase = createServiceClient()
  const { data, error } = await supabase
    .from('kpi_definitions')
    .select(SELECT_COLUMNS)
    .eq('organization_id', organizationId)
    .is('deleted_at', null)
    .order('sort_order', { ascending: true })
    .order('name', { ascending: true })

  if (error) return []
  return (data ?? []) as KpiDefinitionRow[]
}

export async function getHighlightedKpis(organizationId: string): Promise<KpiDefinitionRow[]> {
  const supabase = createServiceClient()
  const { data, error } = await supabase
    .from('kpi_definitions')
    .select(SELECT_COLUMNS)
    .eq('organization_id', organizationId)
    .eq('is_highlighted', true)
    .is('deleted_at', null)
    .order('sort_order', { ascending: true })
    .order('name', { ascending: true })

  if (error) return []
  return (data ?? []) as KpiDefinitionRow[]
}

export async function createKpiDefinition(params: {
  organizationId: string
  name: string
  unit: string
  category: string
  description: string | null
  isHighlighted: boolean
  userId: string
}): Promise<{ definition: KpiDefinitionRow | null; error: string | null }> {
  const supabase = createServiceClient()
  const { data, error } = await supabase
    .from('kpi_definitions')
    .insert({
      organization_id: params.organizationId,
      name: params.name,
      unit: params.unit,
      category: params.category,
      description: params.description,
      is_highlighted: params.isHighlighted,
      created_by: params.userId,
    })
    .select(SELECT_COLUMNS)
    .single()

  if (error) return { definition: null, error: 'Failed to create KPI definition' }
  return { definition: data as KpiDefinitionRow, error: null }
}

export async function updateKpiDefinition(
  id: string,
  organizationId: string,
  updates: {
    name?: string
    unit?: string
    category?: string
    description?: string | null
    is_highlighted?: boolean
    sort_order?: number
  },
  userId: string,
): Promise<{ definition: KpiDefinitionRow | null; error: string | null }> {
  const supabase = createServiceClient()
  const { data, error } = await supabase
    .from('kpi_definitions')
    .update({ ...updates, updated_by: userId, updated_at: new Date().toISOString() })
    .eq('id', id)
    .eq('organization_id', organizationId)
    .is('deleted_at', null)
    .select(SELECT_COLUMNS)
    .single()

  if (error) return { definition: null, error: 'Failed to update KPI definition' }
  return { definition: data as KpiDefinitionRow, error: null }
}

export async function deleteKpiDefinition(id: string, organizationId: string): Promise<{ error: string | null }> {
  const supabase = createServiceClient()
  const { error } = await supabase
    .from('kpi_definitions')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id)
    .eq('organization_id', organizationId)

  if (error) return { error: 'Failed to delete KPI definition' }
  return { error: null }
}
