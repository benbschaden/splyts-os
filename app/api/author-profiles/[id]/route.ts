import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { getOrganizationForUser } from '@/lib/queries/organizations'
import { updateAuthorProfile, deleteAuthorProfile } from '@/lib/queries/author-profiles'

const updateAuthorSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  role: z.string().max(200).nullable().optional(),
  voice: z.string().max(1000).nullable().optional(),
  tone: z.string().max(1000).nullable().optional(),
  writing_style: z.string().max(2000).nullable().optional(),
  personal_pillars: z.string().max(2000).nullable().optional(),
  platform_notes: z.string().max(2000).nullable().optional(),
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
  const parsed = updateAuthorSchema.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 })
  }

  const { profile, error } = await updateAuthorProfile(id, org.id, parsed.data)

  if (error || !profile) return NextResponse.json({ error }, { status: 500 })
  return NextResponse.json({ data: profile })
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
  const { error } = await deleteAuthorProfile(id, org.id)

  if (error) return NextResponse.json({ error }, { status: 500 })
  return NextResponse.json({ data: null })
}
