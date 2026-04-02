import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { getOrganizationForUser } from '@/lib/queries/organizations'
import { getBrandContext, upsertBrandContext } from '@/lib/queries/brand-context'
import { isAtLeastAdmin } from '@/lib/auth/roles'

const brandContextSchema = z.object({
  company_name: z.string().min(1, 'Company name is required'),
  mission: z.string().min(1, 'Mission is required'),
  vision: z.string().min(1, 'Vision is required'),
  north_star: z.string().min(1, 'North star is required'),
  voice: z.string().min(1, 'Voice is required'),
  tone: z.string().min(1, 'Tone is required'),
  pillars: z.string().min(1, 'Pillars are required'),
  target_audience: z.string().min(1, 'Target audience is required'),
  values: z.string().nullable().optional(),
})

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const org = await getOrganizationForUser(user.id)
  if (!org) {
    return NextResponse.json({ error: 'No organisation found' }, { status: 403 })
  }

  const context = await getBrandContext(org.id)
  return NextResponse.json({ data: context })
}

export async function PUT(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const org = await getOrganizationForUser(user.id)
  if (!org || !isAtLeastAdmin(org.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await request.json()
  const parsed = brandContextSchema.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.flatten().fieldErrors },
      { status: 400 },
    )
  }

  const { brandContext, error } = await upsertBrandContext(org.id, {
    ...parsed.data,
    values: parsed.data.values ?? null,
  })

  if (error || !brandContext) {
    return NextResponse.json({ error }, { status: 500 })
  }

  return NextResponse.json({ data: brandContext })
}
