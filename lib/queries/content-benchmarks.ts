import { DEFAULT_BENCHMARKS } from '@/lib/company/default-benchmarks'
import { createServiceClient } from '@/lib/supabase/service'

export type ContentBenchmarkRow = {
  id: string
  organization_id: string
  platform: string
  metric_name: string
  benchmark_value: number
  benchmark_unit: string
  notes: string | null
  created_by: string
  updated_by: string | null
  created_at: string
  updated_at: string
}

export type BenchmarkWithDefault = {
  id?: string
  platform: string
  metric_name: string
  benchmark_value: number
  benchmark_unit: string
  notes: string | null
  isCustom: boolean
}

const SELECT_COLUMNS =
  'id, organization_id, platform, metric_name, benchmark_value, benchmark_unit, notes, created_by, updated_by, created_at, updated_at'

type BenchmarkDbRow = {
  id: string
  organization_id: string
  platform: string
  metric_name: string
  benchmark_value: string | number
  benchmark_unit: string
  notes: string | null
  created_by: string
  updated_by: string | null
  created_at: string
  updated_at: string
}

function rowFromDb(row: BenchmarkDbRow): ContentBenchmarkRow {
  return {
    id: row.id,
    organization_id: row.organization_id,
    platform: row.platform,
    metric_name: row.metric_name,
    benchmark_value: Number(row.benchmark_value),
    benchmark_unit: row.benchmark_unit,
    notes: row.notes,
    created_by: row.created_by,
    updated_by: row.updated_by,
    created_at: row.created_at,
    updated_at: row.updated_at,
  }
}

export async function getContentBenchmarks(organizationId: string): Promise<ContentBenchmarkRow[]> {
  const supabase = createServiceClient()
  const { data, error } = await supabase
    .from('content_benchmarks')
    .select(SELECT_COLUMNS)
    .eq('organization_id', organizationId)
    .is('deleted_at', null)
    .order('platform', { ascending: true })
    .order('metric_name', { ascending: true })

  if (error) return []
  return (data ?? []).map((r) => rowFromDb(r as BenchmarkDbRow))
}

export async function getBenchmarksWithDefaults(organizationId: string): Promise<BenchmarkWithDefault[]> {
  const orgRows = await getContentBenchmarks(organizationId)
  const map = new Map<string, ContentBenchmarkRow>()
  for (const row of orgRows) {
    map.set(`${row.platform}\u0000${row.metric_name}`, row)
  }

  return DEFAULT_BENCHMARKS.map((def) => {
    const key = `${def.platform}\u0000${def.metric_name}`
    const custom = map.get(key)
    if (custom) {
      return {
        id: custom.id,
        platform: def.platform,
        metric_name: def.metric_name,
        benchmark_value: custom.benchmark_value,
        benchmark_unit: custom.benchmark_unit,
        notes: custom.notes ?? null,
        isCustom: true,
      }
    }
    return {
      platform: def.platform,
      metric_name: def.metric_name,
      benchmark_value: def.benchmark_value,
      benchmark_unit: def.benchmark_unit,
      notes: null,
      isCustom: false,
    }
  })
}

export async function upsertBenchmark(params: {
  organizationId: string
  platform: string
  metricName: string
  benchmarkValue: number
  benchmarkUnit: string
  notes: string | null
  userId: string
}): Promise<{ benchmark: ContentBenchmarkRow | null; error: string | null }> {
  const supabase = createServiceClient()
  const now = new Date().toISOString()

  const { data: existing } = await supabase
    .from('content_benchmarks')
    .select('id')
    .eq('organization_id', params.organizationId)
    .eq('platform', params.platform)
    .eq('metric_name', params.metricName)
    .is('deleted_at', null)
    .maybeSingle()

  if (existing?.id) {
    const { data, error } = await supabase
      .from('content_benchmarks')
      .update({
        benchmark_value: params.benchmarkValue,
        benchmark_unit: params.benchmarkUnit,
        notes: params.notes,
        updated_by: params.userId,
        updated_at: now,
      })
      .eq('id', existing.id)
      .eq('organization_id', params.organizationId)
      .is('deleted_at', null)
      .select(SELECT_COLUMNS)
      .single()

    if (error) return { benchmark: null, error: 'Failed to update benchmark' }
    return { benchmark: data ? rowFromDb(data as BenchmarkDbRow) : null, error: null }
  }

  const { data, error } = await supabase
    .from('content_benchmarks')
    .insert({
      organization_id: params.organizationId,
      platform: params.platform,
      metric_name: params.metricName,
      benchmark_value: params.benchmarkValue,
      benchmark_unit: params.benchmarkUnit,
      notes: params.notes,
      created_by: params.userId,
    })
    .select(SELECT_COLUMNS)
    .single()

  if (error) return { benchmark: null, error: 'Failed to save benchmark' }
  return { benchmark: data ? rowFromDb(data as BenchmarkDbRow) : null, error: null }
}

export async function deleteBenchmark(id: string, organizationId: string): Promise<{ error: string | null }> {
  const supabase = createServiceClient()
  const { error } = await supabase
    .from('content_benchmarks')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id)
    .eq('organization_id', organizationId)

  if (error) return { error: 'Failed to reset benchmark' }
  return { error: null }
}
