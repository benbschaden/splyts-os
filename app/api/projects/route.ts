import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { getOrganizationForUser } from '@/lib/queries/organizations'
import { createProject } from '@/lib/queries/projects'

const createProjectSchema = z.object({
  name: z.string().min(1, 'Project name is required').max(200),
  description: z.string().max(1000).nullable().optional(),
  category: z.string().max(100).nullable().optional(),
  visibility: z
    .enum(['private', 'organization', 'team', 'specific_users'])
    .optional()
    .default('organization'),
  tags: z.array(z.string().min(1).max(100)).max(50).optional().default([]),
  teamIds: z.array(z.string().uuid()).optional().default([]),
  memberIds: z.array(z.string().uuid()).optional().default([]),
})

export async function POST(request: Request) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const org = await getOrganizationForUser(user.id)
  if (!org) {
    return NextResponse.json({ error: 'No organisation found' }, { status: 403 })
  }

  const body = await request.json()
  const parsed = createProjectSchema.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.flatten().fieldErrors },
      { status: 400 },
    )
  }

  const { project, error } = await createProject(
    parsed.data.name,
    parsed.data.description ?? null,
    org.id,
    user.id,
    parsed.data.category ?? null,
    parsed.data.visibility,
    parsed.data.tags,
    parsed.data.teamIds,
    parsed.data.memberIds,
  )

  if (error || !project) {
    return NextResponse.json({ error }, { status: 500 })
  }

  return NextResponse.json({ data: project }, { status: 201 })
}
