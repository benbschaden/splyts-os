import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { getOrganizationForUser } from '@/lib/queries/organizations'
import { getPlaybooks, createPlaybook } from '@/lib/queries/playbooks'

const createSchema = z.object({
  title: z.string().min(1).max(255),
  category: z.string().min(1).max(100),
})

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

    const org = await getOrganizationForUser(user.id)
    if (!org) return Response.json({ error: 'Not found' }, { status: 404 })

    const playbooks = await getPlaybooks(org.id)
    return Response.json({ playbooks })
  } catch {
    return Response.json({ error: 'Internal error' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

    const org = await getOrganizationForUser(user.id)
    if (!org) return Response.json({ error: 'Not found' }, { status: 404 })

    const body = await request.json()
    const parsed = createSchema.safeParse(body)
    if (!parsed.success) {
      return Response.json({ error: 'Invalid input' }, { status: 400 })
    }

    const { playbook, error } = await createPlaybook({
      organizationId: org.id,
      userId: user.id,
      title: parsed.data.title,
      category: parsed.data.category,
    })

    if (error || !playbook) {
      return Response.json({ error: 'Failed to create playbook' }, { status: 500 })
    }

    return Response.json({ playbook }, { status: 201 })
  } catch {
    return Response.json({ error: 'Internal error' }, { status: 500 })
  }
}
