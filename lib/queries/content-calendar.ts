import { createServiceClient } from '@/lib/supabase/service'

export type CalendarItemStatus = 'idea' | 'scheduled' | 'in_progress' | 'generated' | 'published' | 'cancelled'

export type ContentCalendarItem = {
  id: string
  organization_id: string
  title: string
  description: string | null
  scheduled_date: string
  content_type_id: string | null
  platform: string | null
  author_id: string | null
  assigned_to: string | null
  output_id: string | null
  status: CalendarItemStatus
  notes: string | null
  created_by: string
  updated_by: string | null
  created_at: string
  updated_at: string
  // Joined fields
  content_types?: { name: string } | null
  outputs?: {
    reach: number | null
    reach_metric: string | null
    published_at: string | null
  } | null
}

export async function getContentCalendarItems(
  organizationId: string,
  options?: { year?: number; month?: number },
): Promise<ContentCalendarItem[]> {
  const supabase = createServiceClient()

  let query = supabase
    .from('content_calendar')
    .select('id, organization_id, title, description, scheduled_date, content_type_id, platform, author_id, assigned_to, output_id, status, notes, created_by, updated_by, created_at, updated_at, content_types(name), outputs(reach, reach_metric, published_at)')
    .eq('organization_id', organizationId)
    .is('deleted_at', null)
    .order('scheduled_date', { ascending: true })

  if (options?.year && options?.month) {
    const startDate = `${options.year}-${String(options.month).padStart(2, '0')}-01`
    const endMonth = options.month === 12 ? 1 : options.month + 1
    const endYear = options.month === 12 ? options.year + 1 : options.year
    const endDate = `${endYear}-${String(endMonth).padStart(2, '0')}-01`
    query = query.gte('scheduled_date', startDate).lt('scheduled_date', endDate)
  }

  const { data, error } = await query

  if (error) return []
  return (data ?? []) as unknown as ContentCalendarItem[]
}

export async function createContentCalendarItem(params: {
  organizationId: string
  title: string
  description: string | null
  scheduledDate: string
  contentTypeId: string | null
  platform: string | null
  authorId: string | null
  assignedTo: string | null
  notes: string | null
  userId: string
}): Promise<{ item: ContentCalendarItem | null; error: string | null }> {
  const supabase = createServiceClient()
  const { data, error } = await supabase
    .from('content_calendar')
    .insert({
      organization_id: params.organizationId,
      title: params.title,
      description: params.description,
      scheduled_date: params.scheduledDate,
      content_type_id: params.contentTypeId,
      platform: params.platform,
      author_id: params.authorId,
      assigned_to: params.assignedTo,
      notes: params.notes,
      created_by: params.userId,
    })
    .select('id, organization_id, title, description, scheduled_date, content_type_id, platform, author_id, assigned_to, output_id, status, notes, created_by, updated_by, created_at, updated_at')
    .single()

  if (error) return { item: null, error: 'Failed to create calendar item' }
  return { item: data as ContentCalendarItem, error: null }
}

export async function updateContentCalendarItem(
  id: string,
  organizationId: string,
  updates: {
    title?: string
    description?: string | null
    scheduled_date?: string
    content_type_id?: string | null
    platform?: string | null
    author_id?: string | null
    assigned_to?: string | null
    output_id?: string | null
    status?: CalendarItemStatus
    notes?: string | null
  },
  userId: string,
): Promise<{ item: ContentCalendarItem | null; error: string | null }> {
  const supabase = createServiceClient()
  const { data, error } = await supabase
    .from('content_calendar')
    .update({ ...updates, updated_by: userId, updated_at: new Date().toISOString() })
    .eq('id', id)
    .eq('organization_id', organizationId)
    .is('deleted_at', null)
    .select('id, organization_id, title, description, scheduled_date, content_type_id, platform, author_id, assigned_to, output_id, status, notes, created_by, updated_by, created_at, updated_at')
    .single()

  if (error) return { item: null, error: 'Failed to update calendar item' }
  return { item: data as ContentCalendarItem, error: null }
}

export async function deleteContentCalendarItem(id: string, organizationId: string): Promise<{ error: string | null }> {
  const supabase = createServiceClient()
  const { error } = await supabase
    .from('content_calendar')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id)
    .eq('organization_id', organizationId)

  if (error) return { error: 'Failed to delete calendar item' }
  return { error: null }
}
