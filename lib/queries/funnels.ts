import { createServiceClient } from '@/lib/supabase/service'

export type FunnelRow = {
  id: string
  organization_id: string
  name: string
  description: string | null
  is_dashboard_default: boolean
  created_by: string
  updated_by: string | null
  created_at: string
  updated_at: string
  deleted_at: string | null
}

export type FunnelStageRow = {
  id: string
  funnel_id: string
  kpi_definition_id: string
  stage_order: number
  label_override: string | null
  created_at: string
}

export type FunnelWithStages = FunnelRow & {
  stages: FunnelStageRow[]
}

const FUNNEL_COLUMNS =
  'id, organization_id, name, description, is_dashboard_default, created_by, updated_by, created_at, updated_at, deleted_at'

const STAGE_COLUMNS =
  'id, funnel_id, kpi_definition_id, stage_order, label_override, created_at'

async function attachStages(
  funnels: FunnelRow[],
): Promise<FunnelWithStages[]> {
  if (funnels.length === 0) return []

  const supabase = createServiceClient()
  const funnelIds = funnels.map((f) => f.id)

  const { data: stages, error } = await supabase
    .from('funnel_stages')
    .select(STAGE_COLUMNS)
    .in('funnel_id', funnelIds)
    .order('stage_order', { ascending: true })

  if (error) {
    return funnels.map((f) => ({ ...f, stages: [] }))
  }

  const stagesByFunnel = new Map<string, FunnelStageRow[]>()
  for (const stage of (stages ?? []) as FunnelStageRow[]) {
    const list = stagesByFunnel.get(stage.funnel_id) ?? []
    list.push(stage)
    stagesByFunnel.set(stage.funnel_id, list)
  }

  return funnels.map((f) => ({
    ...f,
    stages: stagesByFunnel.get(f.id) ?? [],
  }))
}

export async function getFunnels(organizationId: string): Promise<FunnelWithStages[]> {
  const supabase = createServiceClient()
  const { data, error } = await supabase
    .from('funnels')
    .select(FUNNEL_COLUMNS)
    .eq('organization_id', organizationId)
    .is('deleted_at', null)
    .order('name', { ascending: true })

  if (error) return []
  return attachStages((data ?? []) as FunnelRow[])
}

export async function getDashboardFunnel(organizationId: string): Promise<FunnelWithStages | null> {
  const supabase = createServiceClient()
  const { data, error } = await supabase
    .from('funnels')
    .select(FUNNEL_COLUMNS)
    .eq('organization_id', organizationId)
    .eq('is_dashboard_default', true)
    .is('deleted_at', null)
    .limit(1)
    .maybeSingle()

  if (error || !data) return null
  const [withStages] = await attachStages([data as FunnelRow])
  return withStages ?? null
}

export async function createFunnel(params: {
  organizationId: string
  name: string
  description: string | null
  isDashboardDefault: boolean
  stages: { kpiDefinitionId: string; stageOrder: number; labelOverride: string | null }[]
  userId: string
}): Promise<{ funnel: FunnelWithStages | null; error: string | null }> {
  const supabase = createServiceClient()

  if (params.isDashboardDefault) {
    await supabase
      .from('funnels')
      .update({ is_dashboard_default: false, updated_at: new Date().toISOString() })
      .eq('organization_id', params.organizationId)
      .eq('is_dashboard_default', true)
      .is('deleted_at', null)
  }

  const { data: funnel, error: funnelError } = await supabase
    .from('funnels')
    .insert({
      organization_id: params.organizationId,
      name: params.name,
      description: params.description,
      is_dashboard_default: params.isDashboardDefault,
      created_by: params.userId,
    })
    .select(FUNNEL_COLUMNS)
    .single()

  if (funnelError || !funnel) {
    return { funnel: null, error: 'Failed to create funnel' }
  }

  const stageRows = params.stages.map((s) => ({
    funnel_id: funnel.id,
    kpi_definition_id: s.kpiDefinitionId,
    stage_order: s.stageOrder,
    label_override: s.labelOverride,
  }))

  const { data: stages, error: stageError } = await supabase
    .from('funnel_stages')
    .insert(stageRows)
    .select(STAGE_COLUMNS)

  if (stageError) {
    return { funnel: null, error: 'Failed to create funnel stages' }
  }

  return {
    funnel: {
      ...(funnel as FunnelRow),
      stages: ((stages ?? []) as FunnelStageRow[]).sort((a, b) => a.stage_order - b.stage_order),
    },
    error: null,
  }
}

export async function updateFunnel(
  id: string,
  organizationId: string,
  updates: {
    name?: string
    description?: string | null
    is_dashboard_default?: boolean
  },
  stages: { kpiDefinitionId: string; stageOrder: number; labelOverride: string | null }[],
  userId: string,
): Promise<{ funnel: FunnelWithStages | null; error: string | null }> {
  const supabase = createServiceClient()

  if (updates.is_dashboard_default) {
    await supabase
      .from('funnels')
      .update({ is_dashboard_default: false, updated_at: new Date().toISOString() })
      .eq('organization_id', organizationId)
      .eq('is_dashboard_default', true)
      .neq('id', id)
      .is('deleted_at', null)
  }

  const { data: funnel, error: funnelError } = await supabase
    .from('funnels')
    .update({ ...updates, updated_by: userId, updated_at: new Date().toISOString() })
    .eq('id', id)
    .eq('organization_id', organizationId)
    .is('deleted_at', null)
    .select(FUNNEL_COLUMNS)
    .single()

  if (funnelError || !funnel) {
    return { funnel: null, error: 'Failed to update funnel' }
  }

  await supabase.from('funnel_stages').delete().eq('funnel_id', id)

  const stageRows = stages.map((s) => ({
    funnel_id: id,
    kpi_definition_id: s.kpiDefinitionId,
    stage_order: s.stageOrder,
    label_override: s.labelOverride,
  }))

  const { data: newStages, error: stageError } = await supabase
    .from('funnel_stages')
    .insert(stageRows)
    .select(STAGE_COLUMNS)

  if (stageError) {
    return { funnel: null, error: 'Failed to update funnel stages' }
  }

  return {
    funnel: {
      ...(funnel as FunnelRow),
      stages: ((newStages ?? []) as FunnelStageRow[]).sort((a, b) => a.stage_order - b.stage_order),
    },
    error: null,
  }
}

export async function deleteFunnel(
  id: string,
  organizationId: string,
): Promise<{ error: string | null }> {
  const supabase = createServiceClient()

  await supabase.from('funnel_stages').delete().eq('funnel_id', id)

  const { error } = await supabase
    .from('funnels')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id)
    .eq('organization_id', organizationId)

  if (error) return { error: 'Failed to delete funnel' }
  return { error: null }
}
