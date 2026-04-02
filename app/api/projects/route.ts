import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { getOrganizationForUser } from '@/lib/queries/organizations'
import { createProject } from '@/lib/queries/projects'
import { indexContent } from '@/lib/indexing/index-content'

const createProjectSchema = z.object({
  name: z.string().min(1, 'Project name is required').max(200),
  description: z.string().max(1000).nullable().optional(),
  category: z.string().trim().min(1, 'Category is required').max(100),
  visibility: z
    .enum(['private', 'organization', 'team', 'specific_users'])
    .optional()
    .default('organization'),
  tags: z.array(z.string().min(1).max(100)).max(50).optional().default([]),
  teamIds: z.array(z.string().uuid()).optional().default([]),
  memberIds: z.array(z.string().uuid()).optional().default([]),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Must be YYYY-MM-DD').nullable().optional(),
  estimatedEndDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Must be YYYY-MM-DD')
    .min(1, 'Estimated end date is required'),
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
    parsed.data.category,
    parsed.data.visibility,
    parsed.data.tags,
    parsed.data.teamIds,
    parsed.data.memberIds,
    parsed.data.startDate ?? null,
    parsed.data.estimatedEndDate,
  )

  if (error || !project) {
    return NextResponse.json({ error }, { status: 500 })
  }

  indexContent('project', project, org.id).catch(err =>
    console.error('[content-index] Index failed:', err)
  )

  return NextResponse.json({ data: project }, { status: 201 })
}
