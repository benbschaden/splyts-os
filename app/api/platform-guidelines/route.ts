import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { getOrganizationForUser } from '@/lib/queries/organizations'
import { getPlatformGuidelines, createPlatformGuideline } from '@/lib/queries/platform-guidelines'

const createSchema = z.object({
  platform_name: z.string().min(1, 'Platform name is required').max(100),
  guidelines: z.string().min(1, 'Guidelines are required').max(5000),
  format_notes: z.string().max(2000).nullable().optional(),
  cadence: z.string().max(200).nullable().optional(),
  include_in_ai: z.boolean().default(true),
})

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

    const org = await getOrganizationForUser(user.id)
    if (!org) return Response.json({ error: 'Not found' }, { status: 404 })

    const guidelines = await getPlatformGuidelines(org.id)
    return Response.json({ data: guidelines })
  } catch {
    return Response.json({ error: 'Internal error' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

    const org = await getOrganizationForUser(user.id)
    if (!org) return Response.json({ error: 'Not found' }, { status: 404 })
    if (org.role !== 'admin') return Response.json({ error: 'Not found' }, { status: 404 })

    const body = await request.json()
    const parsed = createSchema.safeParse(body)
    if (!parsed.success) {
      return Response.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 })
    }

    const { guideline, error } = await createPlatformGuideline({
      organizationId: org.id,
      platformName: parsed.data.platform_name,
      guidelines: parsed.data.guidelines,
      formatNotes: parsed.data.format_notes ?? null,
      cadence: parsed.data.cadence ?? null,
      includeInAi: parsed.data.include_in_ai,
      userId: user.id,
    })

    if (error || !guideline) return Response.json({ error }, { status: 500 })
    return Response.json({ data: guideline }, { status: 201 })
  } catch {
    return Response.json({ error: 'Internal error' }, { status: 500 })
  }
}
