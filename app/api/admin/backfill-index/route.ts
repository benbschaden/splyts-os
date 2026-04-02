import { createClient } from '@/lib/supabase/server'
import { createUntypedServiceClient } from '@/lib/supabase/service'
import { getOrganizationForUser } from '@/lib/queries/organizations'
import { indexContent } from '@/lib/indexing/index-content'
import { CONTENT_REGISTRY, getRegisteredContentTypes } from '@/lib/indexing/content-registry'

const TABLE_MAP: Record<string, string> = {
  output: 'outputs',
  document: 'documents',
  discussion: 'discussions',
  business_plan: 'business_plans',
  discovery_study: 'discovery_studies',
  discovery_entry: 'discovery_entries',
  customer_insight: 'customer_insights',
  persona: 'personas',
  project: 'projects',
  contact: 'contacts',
  contact_communication: 'contact_communications',
  company_milestone: 'company_milestones',
  product_roadmap_item: 'product_roadmap_items',
  product_feature: 'product_features',
  period_goal: 'period_goals',
  goal_period: 'goal_periods',
  terminology: 'terminology',
  brand_narrative: 'brand_narratives',
  social_proof: 'social_proof',
  competitor: 'competitors',
  content_calendar: 'content_calendar',
  platform_guideline: 'platform_guidelines',
  risk: 'risks',
  project_material: 'project_materials',
  content_idea: 'content_ideas',
  company_knowledge_file: 'company_knowledge_files',
  product_context: 'product_context',
}

export async function POST(req: Request): Promise<Response> {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return Response.json({ error: 'Not found' }, { status: 404 })
  }

  const org = await getOrganizationForUser(user.id)
  if (!org) {
    return Response.json({ error: 'Not found' }, { status: 404 })
  }

  const body = await req.json().catch(() => ({}))
  const contentType = body.content_type as string | undefined
  const batchSize = Math.min(body.batch_size ?? 50, 100)

  if (contentType && !CONTENT_REGISTRY[contentType]) {
    return Response.json(
      { error: `Unknown content type: ${contentType}`, registered: getRegisteredContentTypes() },
      { status: 400 },
    )
  }

  const typesToProcess = contentType ? [contentType] : getRegisteredContentTypes()
  const service = createUntypedServiceClient()
  const results: Record<string, { processed: number; skipped: number; errors: number }> = {}

  for (const type of typesToProcess) {
    const tableName = TABLE_MAP[type]
    if (!tableName) continue

    const stats = { processed: 0, skipped: 0, errors: 0 }

    const hasDeletedAt = !['terminology', 'brand_narratives', 'social_proof', 'competitors',
      'content_calendar', 'platform_guidelines', 'product_context', 'period_goals',
      'goal_periods', 'company_milestones', 'product_roadmap_items', 'product_features',
      'content_ideas'].includes(tableName)

    let query = service.from(tableName).select('*').eq('organization_id', org.id)
    if (hasDeletedAt) {
      query = query.is('deleted_at', null)
    }
    query = query.limit(batchSize)

    const { data: rows, error: fetchError } = await query
    if (fetchError || !rows) {
      stats.errors++
      results[type] = stats
      continue
    }

    const { data: existing } = await service
      .from('content_index')
      .select('content_id')
      .eq('content_type', type)
      .eq('organization_id', org.id)

    const existingIds = new Set((existing ?? []).map((r: { content_id: string }) => r.content_id))

    for (const row of rows) {
      const rowId = (row).id as string
      if (existingIds.has(rowId)) {
        stats.skipped++
        continue
      }

      try {
        await indexContent(type, row, org.id)
        stats.processed++
      } catch {
        stats.errors++
      }
    }

    results[type] = stats
  }

  return Response.json({ results })
}
