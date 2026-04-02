import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { getOrganizationForUser } from '@/lib/queries/organizations'
import { updateCommunication, deleteCommunication } from '@/lib/queries/contact-communications'

const patchSchema = z.object({
  direction: z.enum(['inbound', 'outbound', 'internal_note']).optional(),
  channel: z.enum(['email', 'call', 'meeting', 'chat', 'sms', 'other']).optional(),
  subject: z.string().max(1000).nullable().optional(),
  content: z.string().min(1).max(100000).optional(),
  sent_at: z.string().nullable().optional(),
  is_draft: z.boolean().optional(),
  sentiment: z.enum(['positive', 'neutral', 'negative', 'mixed']).nullable().optional(),
  tags: z.array(z.string().max(100)).max(20).optional(),
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

    const { communication, error } = await updateCommunication(id, org.id, parsed.data)
    if (error || !communication) {
      return Response.json({ error: 'Failed to update communication' }, { status: 500 })
    }

    return Response.json({ data: communication })
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

    const { error } = await deleteCommunication(id, org.id)
    if (error) return Response.json({ error }, { status: 500 })

    return new Response(null, { status: 204 })
  } catch {
    return Response.json({ error: 'Internal error' }, { status: 500 })
  }
}
