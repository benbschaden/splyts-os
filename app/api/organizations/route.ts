import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { createOrganization, getOrganizationForUser } from '@/lib/queries/organizations'

const createOrgSchema = z.object({
  name: z.string().min(1, 'Company name is required').max(100),
})

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Guard: if user already has an org, return it rather than creating a duplicate
  const existing = await getOrganizationForUser(user.id)
  if (existing) {
    return NextResponse.json({ data: existing }, { status: 200 })
  }

  const body = await request.json()
  const parsed = createOrgSchema.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.flatten().fieldErrors },
      { status: 400 },
    )
  }

  const { organization, error } = await createOrganization(parsed.data.name, user.id)

  if (error || !organization) {
    return NextResponse.json({ error }, { status: 500 })
  }

  return NextResponse.json({ data: organization }, { status: 201 })
}
