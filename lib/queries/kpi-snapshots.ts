import { createServiceClient } from '@/lib/supabase/service'

export type KpiSnapshotRow = {
  id: string
  organization_id: string
  snapshot_date: string
  values: Record<string, number>
  notes: string | null
  created_by: string
  created_at: string
  updated_at: string
}

const SELECT_COLUMNS =
  'id, organization_id, snapshot_date, values, notes, created_by, created_at, updated_at'

export async function getKpiSnapshots(
  organizationId: string,
  limit: number = 12,
): Promise<KpiSnapshotRow[]> {
  const supabase = createServiceClient()
  const { data, error } = await supabase
    .from('kpi_snapshots')
    .select(SELECT_COLUMNS)
    .eq('organization_id', organizationId)
    .order('snapshot_date', { ascending: false })
    .limit(limit)

  if (error) return []
  return (data ?? []) as KpiSnapshotRow[]
}

export async function getLatestSnapshot(organizationId: string): Promise<KpiSnapshotRow | null> {
  const supabase = createServiceClient()
  const { data, error } = await supabase
    .from('kpi_snapshots')
    .select(SELECT_COLUMNS)
    .eq('organization_id', organizationId)
    .order('snapshot_date', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error || !data) return null
  return data as KpiSnapshotRow
}

export async function getSnapshotByDate(
  organizationId: string,
  date: string,
): Promise<KpiSnapshotRow | null> {
  const supabase = createServiceClient()
  const { data, error } = await supabase
    .from('kpi_snapshots')
    .select(SELECT_COLUMNS)
    .eq('organization_id', organizationId)
    .eq('snapshot_date', date)
    .maybeSingle()

  if (error || !data) return null
  return data as KpiSnapshotRow
}

export async function upsertSnapshot(
  organizationId: string,
  date: string,
  values: Record<string, number>,
  notes: string | null,
  userId: string,
): Promise<{ snapshot: KpiSnapshotRow | null; error: string | null }> {
  const supabase = createServiceClient()

  const existing = await getSnapshotByDate(organizationId, date)

  if (existing) {
    const { data, error } = await supabase
      .from('kpi_snapshots')
      .update({
        values,
        notes,
        updated_at: new Date().toISOString(),
      })
      .eq('id', existing.id)
      .eq('organization_id', organizationId)
      .select(SELECT_COLUMNS)
      .single()

    if (error) return { snapshot: null, error: 'Failed to update snapshot' }
    return { snapshot: data as KpiSnapshotRow, error: null }
  }

  const { data, error } = await supabase
    .from('kpi_snapshots')
    .insert({
      organization_id: organizationId,
      snapshot_date: date,
      values,
      notes,
      created_by: userId,
    })
    .select(SELECT_COLUMNS)
    .single()

  if (error) return { snapshot: null, error: 'Failed to create snapshot' }
  return { snapshot: data as KpiSnapshotRow, error: null }
}

export async function deleteSnapshot(
  id: string,
  organizationId: string,
): Promise<{ error: string | null }> {
  const supabase = createServiceClient()
  const { error } = await supabase
    .from('kpi_snapshots')
    .delete()
    .eq('id', id)
    .eq('organization_id', organizationId)

  if (error) return { error: 'Failed to delete snapshot' }
  return { error: null }
}
