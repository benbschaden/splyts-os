import { createServiceClient } from '@/lib/supabase/service'

export type TerminologyRow = {
  id: string
  organization_id: string
  term: string
  preferred: string
  avoid: string | null
  context: string | null
  category: string
  sort_order: number
  created_by: string
  updated_by: string | null
  created_at: string
  updated_at: string
}

const SELECT_COLUMNS =
  'id, organization_id, term, preferred, avoid, context, category, sort_order, created_by, updated_by, created_at, updated_at'

export const TERMINOLOGY_CATEGORY_ORDER = ['product', 'brand', 'audience', 'general'] as const

export const TERMINOLOGY_CATEGORY_LABELS: Record<(typeof TERMINOLOGY_CATEGORY_ORDER)[number], string> = {
  product: 'Product',
  brand: 'Brand',
  audience: 'Audience',
  general: 'General',
}

const CATEGORY_ORDER = TERMINOLOGY_CATEGORY_ORDER

function sortTerminologyRows(rows: TerminologyRow[]): TerminologyRow[] {
  const rank = (c: string) => {
    const i = CATEGORY_ORDER.indexOf(c as (typeof CATEGORY_ORDER)[number])
    return i === -1 ? CATEGORY_ORDER.length : i
  }
  return [...rows].sort((a, b) => {
    const dr = rank(a.category) - rank(b.category)
    if (dr !== 0) return dr
    const so = a.sort_order - b.sort_order
    if (so !== 0) return so
    return a.term.localeCompare(b.term, undefined, { sensitivity: 'base' })
  })
}

export async function getTerminology(organizationId: string): Promise<TerminologyRow[]> {
  const supabase = createServiceClient()
  const { data, error } = await supabase
    .from('terminology')
    .select(SELECT_COLUMNS)
    .eq('organization_id', organizationId)
    .is('deleted_at', null)

  if (error) return []
  return sortTerminologyRows((data ?? []) as TerminologyRow[])
}

export async function getTerminologyForAi(organizationId: string): Promise<TerminologyRow[]> {
  return getTerminology(organizationId)
}

export async function createTerminology(params: {
  organizationId: string
  term: string
  preferred: string
  avoid: string | null
  context: string | null
  category: string
  userId: string
}): Promise<{ row: TerminologyRow | null; error: string | null }> {
  const supabase = createServiceClient()
  const { data, error } = await supabase
    .from('terminology')
    .insert({
      organization_id: params.organizationId,
      term: params.term,
      preferred: params.preferred,
      avoid: params.avoid,
      context: params.context,
      category: params.category,
      created_by: params.userId,
    })
    .select(SELECT_COLUMNS)
    .single()

  if (error) return { row: null, error: 'Failed to create terminology' }
  return { row: data as TerminologyRow, error: null }
}

export async function updateTerminology(
  id: string,
  organizationId: string,
  updates: {
    term?: string
    preferred?: string
    avoid?: string | null
    context?: string | null
    category?: string
    sort_order?: number
  },
  userId: string,
): Promise<{ row: TerminologyRow | null; error: string | null }> {
  const supabase = createServiceClient()
  const { data, error } = await supabase
    .from('terminology')
    .update({ ...updates, updated_by: userId, updated_at: new Date().toISOString() })
    .eq('id', id)
    .eq('organization_id', organizationId)
    .is('deleted_at', null)
    .select(SELECT_COLUMNS)
    .single()

  if (error) return { row: null, error: 'Failed to update terminology' }
  return { row: data as TerminologyRow, error: null }
}

export async function deleteTerminology(id: string, organizationId: string): Promise<{ error: string | null }> {
  const supabase = createServiceClient()
  const { error } = await supabase
    .from('terminology')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id)
    .eq('organization_id', organizationId)

  if (error) return { error: 'Failed to delete terminology' }
  return { error: null }
}
