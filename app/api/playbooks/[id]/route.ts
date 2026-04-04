import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { getOrganizationForUser } from '@/lib/queries/organizations'
import { getPlaybookById, updatePlaybook, deletePlaybook, canEditPlaybook } from '@/lib/queries/playbooks'

const updateSchema = z.object({
  title: z.string().min(1).max(255).optional(),
  category: z.string().min(1).max(100).optional(),
  content: z.string().optional(),
})

export async function GET(
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

    const playbook = await getPlaybookById(id, org.id)
    if (!playbook) return Response.json({ error: 'Not found' }, { status: 404 })

    return Response.json({ playbook })
  } catch {
    return Response.json({ error: 'Internal error' }, { status: 500 })
  }
}

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

    const existing = await getPlaybookById(id, org.id)
    if (!existing) return Response.json({ error: 'Not found' }, { status: 404 })

    if (!canEditPlaybook(user.id, org.role, existing)) {
      return Response.json({ error: 'Not found' }, { status: 404 })
    }

    const body = await request.json()
    const parsed = updateSchema.safeParse(body)
    if (!parsed.success) {
      return Response.json({ error: 'Invalid input' }, { status: 400 })
    }

    const { playbook, error } = await updatePlaybook(id, user.id, org.role, parsed.data)
    if (error || !playbook) {
      return Response.json({ error: 'Failed to update playbook' }, { status: 500 })
    }

    return Response.json({ playbook })
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

    const existing = await getPlaybookById(id, org.id)
    if (!existing) return Response.json({ error: 'Not found' }, { status: 404 })

    if (!canEditPlaybook(user.id, org.role, existing)) {
      return Response.json({ error: 'Not found' }, { status: 404 })
    }

    const { error } = await deletePlaybook(id, user.id, org.role)
    if (error) return Response.json({ error }, { status: 500 })

    return new Response(null, { status: 204 })
  } catch {
    return Response.json({ error: 'Internal error' }, { status: 500 })
  }
}
