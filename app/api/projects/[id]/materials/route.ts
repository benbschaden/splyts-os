import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { getOrganizationForUser } from '@/lib/queries/organizations'
import { getProjectMaterials, createProjectMaterial } from '@/lib/queries/project-materials'

const postBodySchema = z.object({
  material_type: z.enum(['note', 'file', 'link']),
  title: z.string().max(2000).optional(),
  content: z.string().max(100_000).optional(),
  file_url: z.string().max(8000).optional(),
  file_name: z.string().max(500).optional(),
  file_mime: z.string().max(200).optional(),
  link_url: z.string().max(8000).optional(),
})

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

    const org = await getOrganizationForUser(user.id)
    if (!org) return Response.json({ error: 'Not found' }, { status: 404 })

    const { id: projectId } = await params

    const db = createServiceClient()
    const { data: project } = await db
      .from('projects')
      .select('id')
      .eq('id', projectId)
      .eq('organization_id', org.id)
      .is('deleted_at', null)
      .maybeSingle()

    if (!project) return Response.json({ error: 'Not found' }, { status: 404 })

    const materials = await getProjectMaterials(projectId, org.id)
    return Response.json(
      { materials },
      {
        headers: {
          'Cache-Control': 'private, no-store, must-revalidate',
        },
      },
    )
  } catch (error) {
    console.error('[projects/[id]/materials GET]', error)
    return Response.json({ error: 'Internal error' }, { status: 500 })
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

    const org = await getOrganizationForUser(user.id)
    if (!org) return Response.json({ error: 'Not found' }, { status: 404 })

    const { id: projectId } = await params

    const db = createServiceClient()
    const { data: project } = await db
      .from('projects')
      .select('id')
      .eq('id', projectId)
      .eq('organization_id', org.id)
      .is('deleted_at', null)
      .maybeSingle()

    if (!project) return Response.json({ error: 'Not found' }, { status: 404 })

    const body = await request.json()
    const parsed = postBodySchema.safeParse(body)
    if (!parsed.success) {
      return Response.json({ error: parsed.error.errors[0]?.message ?? 'Invalid input' }, { status: 400 })
    }

    const { material, error } = await createProjectMaterial(projectId, org.id, user.id, parsed.data)
    if (error || !material) {
      return Response.json({ error: error ?? 'Failed to create material' }, { status: 500 })
    }

    return Response.json({ material }, { status: 201 })
  } catch (error) {
    console.error('[projects/[id]/materials POST]', error)
    return Response.json({ error: 'Internal error' }, { status: 500 })
  }
}
