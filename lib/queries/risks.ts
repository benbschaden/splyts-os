import { createServiceClient } from '@/lib/supabase/service'

export type RiskStatus = 'open' | 'monitoring' | 'mitigated' | 'closed'
export type RiskCategory =
  | 'strategic'
  | 'operational'
  | 'financial'
  | 'legal'
  | 'reputational'
  | 'technical'

export type RiskRow = {
  id: string
  organization_id: string
  title: string
  description: string | null
  category: string
  likelihood: number
  impact: number
  priority_score: number
  owner: string | null
  mitigation: string | null
  status: string
  last_reviewed_at: string | null
  created_by: string
  updated_by: string | null
  created_at: string
  updated_at: string
}

const SELECT_COLUMNS =
  'id, organization_id, title, description, category, likelihood, impact, priority_score, owner, mitigation, status, last_reviewed_at, created_by, updated_by, created_at, updated_at'

export async function getRisks(organizationId: string): Promise<RiskRow[]> {
  const supabase = createServiceClient()
  const { data, error } = await supabase
    .from('risks')
    .select(SELECT_COLUMNS)
    .eq('organization_id', organizationId)
    .is('deleted_at', null)
    .order('priority_score', { ascending: false })
    .order('created_at', { ascending: true })

  if (error) return []
  return (data ?? []) as RiskRow[]
}

export async function getActiveRisks(organizationId: string): Promise<RiskRow[]> {
  const supabase = createServiceClient()
  const { data, error } = await supabase
    .from('risks')
    .select(SELECT_COLUMNS)
    .eq('organization_id', organizationId)
    .in('status', ['open', 'monitoring'])
    .is('deleted_at', null)
    .order('priority_score', { ascending: false })

  if (error) return []
  return (data ?? []) as RiskRow[]
}

export async function createRisk(params: {
  organizationId: string
  title: string
  description: string | null
  category: string
  likelihood: number
  impact: number
  owner: string | null
  mitigation: string | null
  status: RiskStatus
  lastReviewedAt: string | null
  userId: string
}): Promise<{ risk: RiskRow | null; error: string | null }> {
  const supabase = createServiceClient()
  const { data, error } = await supabase
    .from('risks')
    .insert({
      organization_id: params.organizationId,
      title: params.title,
      description: params.description,
      category: params.category,
      likelihood: params.likelihood,
      impact: params.impact,
      owner: params.owner,
      mitigation: params.mitigation,
      status: params.status,
      last_reviewed_at: params.lastReviewedAt,
      created_by: params.userId,
    })
    .select(SELECT_COLUMNS)
    .single()

  if (error) return { risk: null, error: 'Failed to create risk' }
  return { risk: data as RiskRow, error: null }
}

export async function updateRisk(
  id: string,
  organizationId: string,
  updates: {
    title?: string
    description?: string | null
    category?: string
    likelihood?: number
    impact?: number
    owner?: string | null
    mitigation?: string | null
    status?: string
    last_reviewed_at?: string | null
  },
  userId: string,
): Promise<{ risk: RiskRow | null; error: string | null }> {
  const supabase = createServiceClient()
  const { data, error } = await supabase
    .from('risks')
    .update({ ...updates, updated_by: userId, updated_at: new Date().toISOString() })
    .eq('id', id)
    .eq('organization_id', organizationId)
    .is('deleted_at', null)
    .select(SELECT_COLUMNS)
    .single()

  if (error) return { risk: null, error: 'Failed to update risk' }
  return { risk: data as RiskRow, error: null }
}

export async function deleteRisk(
  id: string,
  organizationId: string,
): Promise<{ error: string | null }> {
  const supabase = createServiceClient()
  const { error } = await supabase
    .from('risks')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id)
    .eq('organization_id', organizationId)

  if (error) return { error: 'Failed to delete risk' }
  return { error: null }
}
