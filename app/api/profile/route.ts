import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { getUserProfile, upsertUserProfile } from '@/lib/queries/user-profile'

const updateProfileSchema = z.object({
  full_name: z.string().max(200).nullable().optional(),
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

  const profile = await getUserProfile(user.id)
  return NextResponse.json({
    data: {
      ...profile,
      email: user.email,
    },
  })
}

export async function PUT(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const parsed = updateProfileSchema.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 })
  }

  const existing = await getUserProfile(user.id)

  const { profile, error } = await upsertUserProfile(user.id, {
    full_name: parsed.data.full_name ?? existing?.full_name ?? null,
    role: parsed.data.role ?? existing?.role ?? null,
    avatar_url: existing?.avatar_url ?? null,
    voice: parsed.data.voice ?? existing?.voice ?? null,
    tone: parsed.data.tone ?? existing?.tone ?? null,
    writing_style: parsed.data.writing_style ?? existing?.writing_style ?? null,
    personal_pillars: parsed.data.personal_pillars ?? existing?.personal_pillars ?? null,
    platform_notes: parsed.data.platform_notes ?? existing?.platform_notes ?? null,
  })

  if (error || !profile) return NextResponse.json({ error }, { status: 500 })
  return NextResponse.json({ data: profile })
}
