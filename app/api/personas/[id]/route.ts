import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { getOrganizationForUser } from '@/lib/queries/organizations'
import { updatePersona, deletePersona } from '@/lib/queries/personas'
import { indexContent, removeFromIndex } from '@/lib/indexing/index-content'

const personaFieldSchema = z.string().max(2000).nullable().optional()

const updatePersonaSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  tagline: personaFieldSchema,
  age_range: personaFieldSchema,
  job_title: personaFieldSchema,
  industry: personaFieldSchema,
  company_size: personaFieldSchema,
  location: personaFieldSchema,
  goals: personaFieldSchema,
  frustrations: personaFieldSchema,
  motivations: personaFieldSchema,
  behaviors: personaFieldSchema,
  values: personaFieldSchema,
  channels: personaFieldSchema,
  buying_triggers: personaFieldSchema,
  objections: personaFieldSchema,
  quote: personaFieldSchema,
  include_in_ai: z.boolean().optional(),
})

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const org = await getOrganizationForUser(user.id)
  if (!org || org.role !== 'admin') {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const body = await request.json()
  const parsed = updatePersonaSchema.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 })
  }

  const { persona, error } = await updatePersona(id, org.id, parsed.data)

  if (error || !persona) return NextResponse.json({ error }, { status: 500 })

  indexContent('persona', persona, org.id).catch(err =>
    console.error('[content-index] Index failed:', err)
  )

  return NextResponse.json({ data: persona })
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const org = await getOrganizationForUser(user.id)
  if (!org || org.role !== 'admin') {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const { error } = await deletePersona(id, org.id)

  if (error) return NextResponse.json({ error }, { status: 500 })

  removeFromIndex('persona', id).catch(err =>
    console.error('[content-index] Remove failed:', err)
  )

  return new NextResponse(null, { status: 204 })
}
