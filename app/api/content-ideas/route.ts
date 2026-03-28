import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { getOrganizationForUser } from '@/lib/queries/organizations'
import { getContentIdeasForProject, createContentIdea } from '@/lib/queries/content-ideas'

const ALLOWED_PLATFORMS = [
  'LinkedIn',
  'Email Newsletter',
  'Blog / Website',
  'Instagram',
  'Twitter / X',
  'YouTube',
  'TikTok',
  'Podcast',
  'Other',
]

const createSchema = z.object({
  projectId: z.string().uuid(),
  title: z.string().min(1).max(500),
  description: z.string().max(2000).nullable().optional(),
  platform: z.string().max(100),
  platformOwner: z.enum(['author', 'company']),
})

export async function GET(request: Request): Promise<Response> {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

    const org = await getOrganizationForUser(user.id)
    if (!org) return Response.json({ error: 'Not found' }, { status: 404 })

    const { searchParams } = new URL(request.url)
    const projectId = searchParams.get('projectId')
    if (!projectId) return Response.json({ error: 'projectId is required' }, { status: 400 })

    const ideas = await getContentIdeasForProject(projectId, org.id)
    return Response.json({ ideas })
  } catch {
    return Response.json({ error: 'Internal error' }, { status: 500 })
  }
}

export async function POST(request: Request): Promise<Response> {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

    const org = await getOrganizationForUser(user.id)
    if (!org) return Response.json({ error: 'Not found' }, { status: 404 })

    const body = await request.json()
    const parsed = createSchema.safeParse(body)
    if (!parsed.success) {
      return Response.json({ error: parsed.error.errors[0].message }, { status: 400 })
    }

    const { projectId, title, description, platform, platformOwner } = parsed.data

    if (!ALLOWED_PLATFORMS.includes(platform)) {
      return Response.json({ error: 'Invalid platform' }, { status: 400 })
    }

    const { idea, error } = await createContentIdea({
      organizationId: org.id,
      projectId,
      title,
      description: description ?? null,
      platform,
      platformOwner,
      userId: user.id,
    })

    if (error || !idea) return Response.json({ error: 'Failed to create idea' }, { status: 500 })
    return Response.json({ idea }, { status: 201 })
  } catch {
    return Response.json({ error: 'Internal error' }, { status: 500 })
  }
}
