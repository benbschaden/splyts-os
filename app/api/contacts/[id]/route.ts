import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { getOrganizationForUser } from '@/lib/queries/organizations'
import { updateContact, deleteContact } from '@/lib/queries/contacts'
import { indexContent, removeFromIndex } from '@/lib/indexing/index-content'

const patchSchema = z.object({
  name: z.string().min(1).max(500).optional(),
  email: z.string().email().max(500).nullable().optional(),
  company: z.string().max(500).nullable().optional(),
  role: z.string().max(500).nullable().optional(),
  segment: z
    .enum(['beta_user', 'prospect', 'customer', 'churned', 'investor', 'partner', 'other'])
    .nullable()
    .optional(),
  status: z.enum(['active', 'inactive', 'archived']).optional(),
  health: z.enum(['green', 'yellow', 'red']).nullable().optional(),
  tags: z.array(z.string().max(100)).max(20).optional(),
  notes: z.string().max(10000).nullable().optional(),
  last_contacted_at: z.string().nullable().optional(),
})

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

    const org = await getOrganizationForUser(user.id)
    if (!org) return Response.json({ error: 'Not found' }, { status: 404 })

    const body = await request.json()
    const parsed = patchSchema.safeParse(body)
    if (!parsed.success) {
      return Response.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 })
    }

    const { contact, error } = await updateContact(id, org.id, parsed.data)
    if (error || !contact) return Response.json({ error: 'Failed to update contact' }, { status: 500 })

    indexContent('contact', contact, org.id).catch(err =>
      console.error('[content-index] Index failed:', err)
    )

    return Response.json({ data: contact })
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
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

    const org = await getOrganizationForUser(user.id)
    if (!org) return Response.json({ error: 'Not found' }, { status: 404 })

    const { error } = await deleteContact(id, org.id)
    if (error) return Response.json({ error }, { status: 500 })

    removeFromIndex('contact', id).catch(err =>
      console.error('[content-index] Remove failed:', err)
    )

    return new Response(null, { status: 204 })
  } catch {
    return Response.json({ error: 'Internal error' }, { status: 500 })
  }
}
