import { createUntypedServiceClient } from '@/lib/supabase/service'

export type InsightCategory =
  | 'pain_point'
  | 'feature_request'
  | 'praise'
  | 'objection'
  | 'churn_signal'
  | 'usage_pattern'
  | 'market_insight'
export type InsightImpact = 'high' | 'medium' | 'low'
export type InsightStatus = 'new' | 'validated' | 'actioned' | 'archived'
export type InsightSourceSegment = 'beta_user' | 'free_user' | 'customer' | 'power_user' | 'prospect' | 'churned' | 'other'

export interface CustomerInsightRow {
  id: string
  organization_id: string
  created_by: string
  content: string
  category: InsightCategory
  impact: InsightImpact
  status: InsightStatus
  source_contact_id: string | null
  source_communication_id: string | null
  source_segment: InsightSourceSegment | null
  tags: string[]
  include_in_ai: boolean
  created_at: string
  updated_at: string
  deleted_at: string | null
  source_contact_name: string | null
}

const SELECT_COLUMNS =
  'id, organization_id, created_by, content, category, impact, status, source_contact_id, source_communication_id, source_segment, tags, include_in_ai, created_at, updated_at, deleted_at, contacts:source_contact_id(name)'

function mapRow(row: Record<string, unknown>): CustomerInsightRow {
  return {
    id: row.id as string,
    organization_id: row.organization_id as string,
    created_by: row.created_by as string,
    content: row.content as string,
    category: row.category as InsightCategory,
    impact: row.impact as InsightImpact,
    status: row.status as InsightStatus,
    source_contact_id: (row.source_contact_id as string | null) ?? null,
    source_communication_id: (row.source_communication_id as string | null) ?? null,
    source_segment: (row.source_segment as InsightSourceSegment | null) ?? null,
    tags: (row.tags as string[]) ?? [],
    include_in_ai: row.include_in_ai as boolean,
    created_at: row.created_at as string,
    updated_at: row.updated_at as string,
    deleted_at: (row.deleted_at as string | null) ?? null,
    source_contact_name: (row.contacts as { name?: string } | null)?.name ?? null,
  }
}

export async function getCustomerInsightsForOrg(orgId: string): Promise<CustomerInsightRow[]> {
  const supabase = createUntypedServiceClient()
  const { data, error } = await supabase
    .from('customer_insights')
    .select(SELECT_COLUMNS)
    .eq('organization_id', orgId)
    .is('deleted_at', null)
    .order('created_at', { ascending: false })

  if (error || !data) return []
  return (data as unknown as Record<string, unknown>[]).map(mapRow)
}

export async function getAiVisibleInsights(orgId: string): Promise<CustomerInsightRow[]> {
  const supabase = createUntypedServiceClient()
  const { data, error } = await supabase
    .from('customer_insights')
    .select(SELECT_COLUMNS)
    .eq('organization_id', orgId)
    .eq('include_in_ai', true)
    .not('status', 'eq', 'archived')
    .is('deleted_at', null)
    .order('created_at', { ascending: false })

  if (error || !data) return []
  return (data as unknown as Record<string, unknown>[]).map(mapRow)
}

export async function createInsight(params: {
  organizationId: string
  userId: string
  content: string
  category: InsightCategory
  impact?: InsightImpact
  status?: InsightStatus
  source_contact_id?: string | null
  source_communication_id?: string | null
  source_segment?: InsightSourceSegment | null
  tags?: string[]
  include_in_ai?: boolean
}): Promise<{ insight: CustomerInsightRow | null; error: string | null }> {
  const supabase = createUntypedServiceClient()
  const { data, error } = await supabase
    .from('customer_insights')
    .insert({
      organization_id: params.organizationId,
      created_by: params.userId,
      content: params.content,
      category: params.category,
      impact: params.impact ?? 'medium',
      status: params.status ?? 'new',
      source_contact_id: params.source_contact_id ?? null,
      source_communication_id: params.source_communication_id ?? null,
      source_segment: params.source_segment ?? null,
      tags: params.tags ?? [],
      include_in_ai: params.include_in_ai ?? true,
    })
    .select(SELECT_COLUMNS)
    .single()

  if (error || !data) return { insight: null, error: 'Failed to create insight' }
  return { insight: mapRow(data as unknown as Record<string, unknown>), error: null }
}

export async function updateInsight(
  id: string,
  orgId: string,
  updates: Partial<Omit<CustomerInsightRow, 'id' | 'organization_id' | 'created_by' | 'created_at' | 'updated_at' | 'deleted_at' | 'source_contact_name'>>,
): Promise<{ insight: CustomerInsightRow | null; error: string | null }> {
  const supabase = createUntypedServiceClient()
  const { data, error } = await supabase
    .from('customer_insights')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .eq('organization_id', orgId)
    .is('deleted_at', null)
    .select(SELECT_COLUMNS)
    .single()

  if (error || !data) return { insight: null, error: 'Failed to update insight' }
  return { insight: mapRow(data as unknown as Record<string, unknown>), error: null }
}

export async function deleteInsight(
  id: string,
  orgId: string,
): Promise<{ error: string | null }> {
  const supabase = createUntypedServiceClient()
  const { error } = await supabase
    .from('customer_insights')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id)
    .eq('organization_id', orgId)

  if (error) return { error: 'Failed to delete insight' }
  return { error: null }
}
