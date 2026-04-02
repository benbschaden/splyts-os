import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { getOrganizationForUser } from '@/lib/queries/organizations'
import { updateOutput, publishOutput, updateOutputPerformance, deleteOutput } from '@/lib/queries/outputs'
import { createServiceClient } from '@/lib/supabase/service'
import { indexContent, removeFromIndex } from '@/lib/indexing/index-content'
import { isAtLeastAdmin } from '@/lib/auth/roles'

const patchSchema = z.object({
  content: z.string().min(1, 'Content is required').optional(),
  publish: z.boolean().optional(),
  reach: z.number().int().min(0).nullable().optional(),
  reach_metric: z.enum(['impressions', 'views', 'opens', 'plays', 'other']).nullable().optional(),
  engagement: z.number().int().min(0).nullable().optional(),
  performance_notes: z.string().max(2000).nullable().optional(),
  views_1d: z.number().int().min(0).nullable().optional(),
  views_7d: z.number().int().min(0).nullable().optional(),
  views_30d: z.number().int().min(0).nullable().optional(),
  website_visits: z.number().int().min(0).nullable().optional(),
  email_signups: z.number().int().min(0).nullable().optional(),
})

async function isCreatorOrAdmin(outputId: string, orgId: string, userId: string, userRole: string): Promise<boolean> {
  if (isAtLeastAdmin(userRole)) return true
  const db = createServiceClient()
  const { data } = await db
    .from('outputs')
    .select('created_by')
    .eq('id', outputId)
    .eq('organization_id', orgId)
    .is('deleted_at', null)
    .maybeSingle()
  return data?.created_by === userId
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const org = await getOrganizationForUser(user.id)
  if (!org) return Response.json({ error: 'Organisation not found' }, { status: 404 })

  const canEdit = await isCreatorOrAdmin(id, org.id, user.id, org.role)
  if (!canEdit) return Response.json({ error: 'Not found' }, { status: 404 })

  const body = await request.json()
  const parsed = patchSchema.safeParse(body)
  if (!parsed.success) {
    return Response.json({ error: parsed.error.errors[0].message }, { status: 400 })
  }

  const {
    content, publish,
    reach, reach_metric, engagement, performance_notes,
    views_1d, views_7d, views_30d, website_visits, email_signups,
  } = parsed.data

  // Handle publish
  if (publish === true) {
    const { output, error } = await publishOutput(id, org.id, user.id)
    if (error || !output) return Response.json({ error }, { status: 500 })
    indexContent('output', output, org.id).catch(err =>
      console.error('[content-index] Index failed:', err)
    )
    return Response.json({ output })
  }

  // Handle performance stats update (includes new time-windowed fields)
  if (
    reach !== undefined || reach_metric !== undefined ||
    engagement !== undefined || performance_notes !== undefined ||
    views_1d !== undefined || views_7d !== undefined || views_30d !== undefined ||
    website_visits !== undefined || email_signups !== undefined
  ) {
    const { output, error } = await updateOutputPerformance(id, org.id, {
      reach: reach ?? null,
      reach_metric: reach_metric ?? null,
      engagement: engagement ?? null,
      performance_notes: performance_notes ?? null,
      views_1d,
      views_7d,
      views_30d,
      website_visits,
      email_signups,
    })
    if (error || !output) return Response.json({ error }, { status: 500 })
    indexContent('output', output, org.id).catch(err =>
      console.error('[content-index] Index failed:', err)
    )
    return Response.json({ output })
  }

  // Handle content update
  if (!content) {
    return Response.json({ error: 'Content is required' }, { status: 400 })
  }

  const { output, error } = await updateOutput(id, org.id, content)
  if (error || !output) return Response.json({ error }, { status: 500 })

  indexContent('output', output, org.id).catch(err =>
    console.error('[content-index] Index failed:', err)
  )

  return Response.json({ output })
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const org = await getOrganizationForUser(user.id)
  if (!org) return Response.json({ error: 'Organisation not found' }, { status: 404 })

  const canEdit = await isCreatorOrAdmin(id, org.id, user.id, org.role)
  if (!canEdit) return Response.json({ error: 'Not found' }, { status: 404 })

  const { error } = await deleteOutput(id, org.id)
  if (error) return Response.json({ error }, { status: 500 })

  removeFromIndex('output', id).catch(err =>
    console.error('[content-index] Remove failed:', err)
  )

  return new Response(null, { status: 204 })
}
