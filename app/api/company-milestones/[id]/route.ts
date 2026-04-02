import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { getOrganizationForUser } from '@/lib/queries/organizations'
import { updateCompanyMilestone, deleteCompanyMilestone } from '@/lib/queries/company-milestones'
import { indexContent, removeFromIndex } from '@/lib/indexing/index-content'
import { isAtLeastAdmin } from '@/lib/auth/roles'

const patchSchema = z.object({
  title: z.string().min(1).max(300).optional(),
  description: z.string().max(2000).nullable().optional(),
  milestone_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  category: z.enum(['fundraising', 'hiring', 'launch', 'revenue', 'partnership', 'product', 'other']).optional(),
  status: z.enum(['planned', 'achieved', 'missed', 'pushed']).optional(),
  completion_notes: z.string().max(2000).nullable().optional(),
})

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

    const org = await getOrganizationForUser(user.id)
    if (!org) return Response.json({ error: 'Not found' }, { status: 404 })
    if (!isAtLeastAdmin(org.role)) return Response.json({ error: 'Not found' }, { status: 404 })

    const body = await request.json()
    const parsed = patchSchema.safeParse(body)
    if (!parsed.success) {
      return Response.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 })
    }

    const { milestone, error } = await updateCompanyMilestone(id, org.id, parsed.data, user.id)
    if (error || !milestone) return Response.json({ error }, { status: 500 })

    indexContent('company_milestone', milestone, org.id).catch(err =>
      console.error('[content-index] Index failed:', err)
    )

    return Response.json({ data: milestone })
  } catch {
    return Response.json({ error: 'Internal error' }, { status: 500 })
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

    const org = await getOrganizationForUser(user.id)
    if (!org) return Response.json({ error: 'Not found' }, { status: 404 })
    if (!isAtLeastAdmin(org.role)) return Response.json({ error: 'Not found' }, { status: 404 })

    const { error } = await deleteCompanyMilestone(id, org.id)
    if (error) return Response.json({ error }, { status: 500 })

    removeFromIndex('company_milestone', id).catch(err =>
      console.error('[content-index] Remove failed:', err)
    )

    return new Response(null, { status: 204 })
  } catch {
    return Response.json({ error: 'Internal error' }, { status: 500 })
  }
}
