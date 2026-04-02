import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { getOrganizationForUser } from '@/lib/queries/organizations'
import { getPersonas, createPersona } from '@/lib/queries/personas'
import { indexContent } from '@/lib/indexing/index-content'
import { isAtLeastAdmin } from '@/lib/auth/roles'

const personaFieldSchema = z.string().max(2000).nullable().optional()

const createPersonaSchema = z.object({
  name: z.string().min(1, 'Name is required').max(200),
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

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const org = await getOrganizationForUser(user.id)
  if (!org) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const personas = await getPersonas(org.id)
  return NextResponse.json({ data: personas })
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const org = await getOrganizationForUser(user.id)
  if (!org || !isAtLeastAdmin(org.role)) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const body = await request.json()
  const parsed = createPersonaSchema.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 })
  }

  const d = parsed.data
  const { persona, error } = await createPersona(
    {
      name: d.name,
      tagline: d.tagline ?? null,
      age_range: d.age_range ?? null,
      job_title: d.job_title ?? null,
      industry: d.industry ?? null,
      company_size: d.company_size ?? null,
      location: d.location ?? null,
      goals: d.goals ?? null,
      frustrations: d.frustrations ?? null,
      motivations: d.motivations ?? null,
      behaviors: d.behaviors ?? null,
      values: d.values ?? null,
      channels: d.channels ?? null,
      buying_triggers: d.buying_triggers ?? null,
      objections: d.objections ?? null,
      quote: d.quote ?? null,
      include_in_ai: d.include_in_ai ?? true,
    },
    org.id,
    user.id,
  )

  if (error || !persona) return NextResponse.json({ error }, { status: 500 })

  indexContent('persona', persona, org.id).catch(err =>
    console.error('[content-index] Index failed:', err)
  )

  return NextResponse.json({ data: persona }, { status: 201 })
}
