import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { getOrganizationForUser } from '@/lib/queries/organizations'
import { getContentTypes, createContentType } from '@/lib/queries/content-types'

const createSchema = z.object({
  name: z.string().min(1, 'Name is required').max(200),
  template_id: z.string().uuid('Invalid template'),
  custom_rules: z.string().min(1, 'Custom rules are required').max(3000),
  platform: z.string().max(100).nullable().optional(),
  cadence: z.string().max(200).nullable().optional(),
})

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const org = await getOrganizationForUser(user.id)
  if (!org) return NextResponse.json({ error: 'No organisation found' }, { status: 403 })

  const types = await getContentTypes(org.id)
  return NextResponse.json({ data: types })
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const org = await getOrganizationForUser(user.id)
  if (!org || org.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await request.json()
  const parsed = createSchema.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 })
  }

  const { contentType, error } = await createContentType(org.id, user.id, {
    ...parsed.data,
    platform: parsed.data.platform ?? null,
    cadence: parsed.data.cadence ?? null,
  })

  if (error || !contentType) return NextResponse.json({ error }, { status: 500 })
  return NextResponse.json({ data: contentType }, { status: 201 })
}
