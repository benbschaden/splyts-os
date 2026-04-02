import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { getOrganizationForUser } from '@/lib/queries/organizations'
import { updateRisk, deleteRisk } from '@/lib/queries/risks'
import { indexContent, removeFromIndex } from '@/lib/indexing/index-content'
import { isAtLeastAdmin } from '@/lib/auth/roles'

const updateSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(2000).nullable().optional(),
  category: z.enum(['strategic', 'operational', 'financial', 'legal', 'reputational', 'technical']).optional(),
  likelihood: z.number().int().min(1).max(5).optional(),
  impact: z.number().int().min(1).max(5).optional(),
  owner: z.string().max(200).nullable().optional(),
  mitigation: z.string().max(2000).nullable().optional(),
  status: z.enum(['open', 'monitoring', 'mitigated', 'closed']).optional(),
  last_reviewed_at: z.string().datetime({ offset: true }).nullable().optional(),
})

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const org = await getOrganizationForUser(user.id)
  if (!org) return Response.json({ error: 'Not found' }, { status: 404 })
  if (!isAtLeastAdmin(org.role)) return Response.json({ error: 'Forbidden' }, { status: 403 })

  const body = await request.json()
  const parsed = updateSchema.safeParse(body)
  if (!parsed.success) {
    return Response.json({ error: 'Invalid input', details: parsed.error.flatten().fieldErrors }, { status: 400 })
  }

  const { risk, error } = await updateRisk(id, org.id, parsed.data, user.id)
  if (error || !risk) return Response.json({ error: error ?? 'Failed to update risk' }, { status: 500 })

  indexContent('risk', risk, org.id).catch(err =>
    console.error('[content-index] Index failed:', err)
  )

  return Response.json({ risk })
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
  if (!org) return Response.json({ error: 'Not found' }, { status: 404 })
  if (!isAtLeastAdmin(org.role)) return Response.json({ error: 'Forbidden' }, { status: 403 })

  const { error } = await deleteRisk(id, org.id)
  if (error) return Response.json({ error }, { status: 500 })

  removeFromIndex('risk', id).catch(err =>
    console.error('[content-index] Remove failed:', err)
  )

  return new Response(null, { status: 204 })
}
