import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { getOrganizationForUser } from '@/lib/queries/organizations'
import { getAuthorProfiles, createAuthorProfile } from '@/lib/queries/author-profiles'
import { isAtLeastAdmin } from '@/lib/auth/roles'

const createAuthorSchema = z.object({
  name: z.string().min(1, 'Name is required').max(200),
  role: z.string().max(200).nullable().optional(),
  voice: z.string().max(1000).nullable().optional(),
  tone: z.string().max(1000).nullable().optional(),
  writing_style: z.string().max(2000).nullable().optional(),
  personal_pillars: z.string().max(2000).nullable().optional(),
  platform_notes: z.string().max(2000).nullable().optional(),
})

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const org = await getOrganizationForUser(user.id)
  if (!org) return NextResponse.json({ error: 'No organisation found' }, { status: 403 })

  const profiles = await getAuthorProfiles(org.id)
  return NextResponse.json({ data: profiles })
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const org = await getOrganizationForUser(user.id)
  if (!org || !isAtLeastAdmin(org.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await request.json()
  const parsed = createAuthorSchema.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 })
  }

  const { profile, error } = await createAuthorProfile(
    {
      name: parsed.data.name,
      role: parsed.data.role ?? null,
      voice: parsed.data.voice ?? null,
      tone: parsed.data.tone ?? null,
      writing_style: parsed.data.writing_style ?? null,
      personal_pillars: parsed.data.personal_pillars ?? null,
      platform_notes: parsed.data.platform_notes ?? null,
    },
    org.id,
    user.id,
  )

  if (error || !profile) return NextResponse.json({ error }, { status: 500 })
  return NextResponse.json({ data: profile }, { status: 201 })
}
