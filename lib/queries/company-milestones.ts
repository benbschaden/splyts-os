import { createServiceClient } from '@/lib/supabase/service'

export type CompanyMilestone = {
  id: string
  organization_id: string
  title: string
  description: string | null
  milestone_date: string
  category: 'fundraising' | 'hiring' | 'launch' | 'revenue' | 'partnership' | 'product' | 'other'
  status: 'planned' | 'achieved' | 'missed' | 'pushed'
  sort_order: number
  created_by: string
  updated_by: string | null
  created_at: string
  updated_at: string
}

export async function getCompanyMilestones(organizationId: string): Promise<CompanyMilestone[]> {
  const supabase = createServiceClient()
  const { data, error } = await supabase
    .from('company_milestones')
    .select('id, organization_id, title, description, milestone_date, category, status, sort_order, created_by, updated_by, created_at, updated_at')
    .eq('organization_id', organizationId)
    .is('deleted_at', null)
    .order('milestone_date', { ascending: true })

  if (error) return []
  return (data ?? []) as CompanyMilestone[]
}

export async function createCompanyMilestone(params: {
  organizationId: string
  title: string
  description: string | null
  milestoneDate: string
  category: string
  status: string
  userId: string
}): Promise<{ milestone: CompanyMilestone | null; error: string | null }> {
  const supabase = createServiceClient()
  const { data, error } = await supabase
    .from('company_milestones')
    .insert({
      organization_id: params.organizationId,
      title: params.title,
      description: params.description,
      milestone_date: params.milestoneDate,
      category: params.category,
      status: params.status,
      created_by: params.userId,
    })
    .select('id, organization_id, title, description, milestone_date, category, status, sort_order, created_by, updated_by, created_at, updated_at')
    .single()

  if (error) return { milestone: null, error: 'Failed to create milestone' }
  return { milestone: data as CompanyMilestone, error: null }
}

export async function updateCompanyMilestone(
  id: string,
  organizationId: string,
  updates: {
    title?: string
    description?: string | null
    milestone_date?: string
    category?: string
    status?: string
  },
  userId: string,
): Promise<{ milestone: CompanyMilestone | null; error: string | null }> {
  const supabase = createServiceClient()
  const { data, error } = await supabase
    .from('company_milestones')
    .update({ ...updates, updated_by: userId, updated_at: new Date().toISOString() })
    .eq('id', id)
    .eq('organization_id', organizationId)
    .is('deleted_at', null)
    .select('id, organization_id, title, description, milestone_date, category, status, sort_order, created_by, updated_by, created_at, updated_at')
    .single()

  if (error) return { milestone: null, error: 'Failed to update milestone' }
  return { milestone: data as CompanyMilestone, error: null }
}

export async function deleteCompanyMilestone(id: string, organizationId: string): Promise<{ error: string | null }> {
  const supabase = createServiceClient()
  const { error } = await supabase
    .from('company_milestones')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id)
    .eq('organization_id', organizationId)

  if (error) return { error: 'Failed to delete milestone' }
  return { error: null }
}
