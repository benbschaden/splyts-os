import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { getOrganizationForUser } from '@/lib/queries/organizations'
import { updateContentType, deleteContentType } from '@/lib/queries/content-types'

const updateSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  custom_rules: z.string().min(1).max(3000).optional(),
  is_active: z.boolean().optional(),
  platform: z.string().max(100).nullable().optional(),
  cadence: z.string().max(200).nullable().optional(),
})

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const org = await getOrganizationForUser(user.id)
  if (!org || org.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { id } = await params
  const body = await request.json()
  const parsed = updateSchema.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 })
  }

  const { contentType, error } = await updateContentType(id, org.id, parsed.data)

  if (error || !contentType) return NextResponse.json({ error }, { status: 500 })
  return NextResponse.json({ data: contentType })
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const org = await getOrganizationForUser(user.id)
  if (!org || org.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { id } = await params
  const { error } = await deleteContentType(id, org.id)

  if (error) return NextResponse.json({ error }, { status: 500 })
  return NextResponse.json({ data: null })
}
