import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { getOrganizationForUser } from '@/lib/queries/organizations'
import { getBusinessPlan, upsertBusinessPlan } from '@/lib/queries/business-plan'
import { indexContent } from '@/lib/indexing/index-content'
import { isOwner } from '@/lib/auth/roles'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const org = await getOrganizationForUser(user.id)
  if (!org) return Response.json({ error: 'Not found' }, { status: 404 })

  const plan = await getBusinessPlan(org.id)
  return Response.json({ plan })
}

const schema = z.object({
  sections: z.record(z.string(), z.string()),
})

export async function PATCH(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const org = await getOrganizationForUser(user.id)
  if (!org) return Response.json({ error: 'Not found' }, { status: 404 })

  if (!isOwner(org.role)) {
    return Response.json({ error: 'Not found' }, { status: 404 })
  }

  const body = await request.json()
  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return Response.json({ error: 'Invalid input' }, { status: 400 })
  }

  const { plan, error } = await upsertBusinessPlan(org.id, parsed.data.sections)
  if (error) {
    return Response.json({ error }, { status: 500 })
  }

  if (plan) {
    indexContent('business_plan', plan, org.id).catch(err =>
      console.error('[content-index] Index failed:', err)
    )
  }

  return Response.json({ plan })
}
