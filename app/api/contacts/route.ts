import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { getOrganizationForUser } from '@/lib/queries/organizations'
import { createContact } from '@/lib/queries/contacts'

const createSchema = z.object({
  name: z.string().min(1).max(500),
  email: z.string().email().max(500).nullable().optional(),
  company: z.string().max(500).nullable().optional(),
  role: z.string().max(500).nullable().optional(),
  segment: z
    .enum(['beta_user', 'prospect', 'customer', 'churned', 'investor', 'partner', 'other'])
    .nullable()
    .optional(),
  health: z.enum(['green', 'yellow', 'red']).nullable().optional(),
  tags: z.array(z.string().max(100)).max(20).default([]),
  notes: z.string().max(10000).nullable().optional(),
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
    const { contact, error } = await createContact({
      organizationId: org.id,
      userId: user.id,
      name: d.name,
      email: d.email ?? null,
      company: d.company ?? null,
      role: d.role ?? null,
      segment: d.segment ?? null,
      health: d.health ?? null,
      tags: d.tags,
      notes: d.notes ?? null,
    })

    if (error || !contact) return Response.json({ error: 'Failed to create contact' }, { status: 500 })
    return Response.json({ data: contact }, { status: 201 })
  } catch {
    return Response.json({ error: 'Internal error' }, { status: 500 })
  }
}
