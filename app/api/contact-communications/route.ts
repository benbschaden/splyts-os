import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { getOrganizationForUser } from '@/lib/queries/organizations'
import { createCommunication } from '@/lib/queries/contact-communications'
import { indexContent } from '@/lib/indexing/index-content'

const createSchema = z.object({
  contact_id: z.string().uuid(),
  direction: z.enum(['inbound', 'outbound', 'internal_note']),
  channel: z.enum(['email', 'call', 'meeting', 'chat', 'sms', 'testflight', 'userjot', 'other']),
  subject: z.string().max(1000).nullable().optional(),
  content: z.string().min(1).max(100000),
  sent_at: z.string().nullable().optional(),
  is_draft: z.boolean().default(false),
  sentiment: z.enum(['positive', 'neutral', 'negative', 'mixed']).nullable().optional(),
  tags: z.array(z.string().max(100)).max(20).default([]),
})

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

    const org = await getOrganizationForUser(user.id)
    if (!org) return Response.json({ error: 'Not found' }, { status: 404 })

    const body = await request.json()
    const parsed = createSchema.safeParse(body)
    if (!parsed.success) {
      return Response.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 })
    }

    const d = parsed.data
    const { communication, error } = await createCommunication({
      organizationId: org.id,
      contactId: d.contact_id,
      userId: user.id,
      direction: d.direction,
      channel: d.channel,
      subject: d.subject ?? null,
      content: d.content,
      sent_at: d.sent_at ?? null,
      is_draft: d.is_draft,
      sentiment: d.sentiment ?? null,
      tags: d.tags,
    })

    if (error || !communication) {
      return Response.json({ error: 'Failed to create communication' }, { status: 500 })
    }

    indexContent('contact_communication', communication, org.id).catch(err =>
      console.error('[content-index] Index failed:', err)
    )

    return Response.json({ data: communication }, { status: 201 })
  } catch {
    return Response.json({ error: 'Internal error' }, { status: 500 })
  }
}
