import { createServiceClient } from '@/lib/supabase/service'

export type SocialProofRow = {
  id: string
  organization_id: string
  proof_type: string
  quote: string | null
  attribution: string | null
  company: string | null
  metric_value: string | null
  metric_label: string | null
  tags: string[]
  approved: boolean
  include_in_ai: boolean
  sort_order: number
  created_by: string
  updated_by: string | null
  created_at: string
  updated_at: string
}

const SELECT_COLUMNS =
  'id, organization_id, proof_type, quote, attribution, company, metric_value, metric_label, tags, approved, include_in_ai, sort_order, created_by, updated_by, created_at, updated_at'

export async function getSocialProof(organizationId: string): Promise<SocialProofRow[]> {
  const supabase = createServiceClient()
  const { data, error } = await supabase
    .from('social_proof')
    .select(SELECT_COLUMNS)
    .eq('organization_id', organizationId)
    .is('deleted_at', null)
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: true })

  if (error) return []
  return (data ?? []).map((row) => normalizeSocialProofRow(row as Record<string, unknown>))
}

function normalizeSocialProofRow(row: Record<string, unknown>): SocialProofRow {
  const tags = row.tags
  return {
    ...(row as unknown as SocialProofRow),
    tags: Array.isArray(tags) ? (tags as string[]) : [],
  }
}

export async function getApprovedSocialProof(organizationId: string): Promise<SocialProofRow[]> {
  const supabase = createServiceClient()
  const { data, error } = await supabase
    .from('social_proof')
    .select(SELECT_COLUMNS)
    .eq('organization_id', organizationId)
    .eq('approved', true)
    .eq('include_in_ai', true)
    .is('deleted_at', null)
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: true })

  if (error) return []
  return (data ?? []).map((row) => normalizeSocialProofRow(row as Record<string, unknown>))
}

export async function createSocialProof(params: {
  organizationId: string
  proofType: string
  quote: string | null
  attribution: string | null
  company: string | null
  metricValue: string | null
  metricLabel: string | null
  tags: string[]
  approved: boolean
  includeInAi: boolean
  userId: string
}): Promise<{ socialProof: SocialProofRow | null; error: string | null }> {
  const supabase = createServiceClient()
  const { data, error } = await supabase
    .from('social_proof')
    .insert({
      organization_id: params.organizationId,
      proof_type: params.proofType,
      quote: params.quote,
      attribution: params.attribution,
      company: params.company,
      metric_value: params.metricValue,
      metric_label: params.metricLabel,
      tags: params.tags,
      approved: params.approved,
      include_in_ai: params.includeInAi,
      created_by: params.userId,
    })
    .select(SELECT_COLUMNS)
    .single()

  if (error) return { socialProof: null, error: 'Failed to create social proof' }
  return { socialProof: normalizeSocialProofRow(data as Record<string, unknown>), error: null }
}

export async function updateSocialProof(
  id: string,
  organizationId: string,
  updates: {
    proof_type?: string
    quote?: string | null
    attribution?: string | null
    company?: string | null
    metric_value?: string | null
    metric_label?: string | null
    tags?: string[]
    approved?: boolean
    include_in_ai?: boolean
    sort_order?: number
  },
  userId: string,
): Promise<{ socialProof: SocialProofRow | null; error: string | null }> {
  const supabase = createServiceClient()
  const { data, error } = await supabase
    .from('social_proof')
    .update({ ...updates, updated_by: userId, updated_at: new Date().toISOString() })
    .eq('id', id)
    .eq('organization_id', organizationId)
    .is('deleted_at', null)
    .select(SELECT_COLUMNS)
    .single()

  if (error) return { socialProof: null, error: 'Failed to update social proof' }
  return { socialProof: normalizeSocialProofRow(data as Record<string, unknown>), error: null }
}

export async function deleteSocialProof(id: string, organizationId: string): Promise<{ error: string | null }> {
  const supabase = createServiceClient()
  const { error } = await supabase
    .from('social_proof')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id)
    .eq('organization_id', organizationId)

  if (error) return { error: 'Failed to delete social proof' }
  return { error: null }
}
