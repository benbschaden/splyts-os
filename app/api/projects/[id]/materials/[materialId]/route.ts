import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { getOrganizationForUser } from '@/lib/queries/organizations'
import { updateProjectMaterial, deleteProjectMaterial } from '@/lib/queries/project-materials'

const patchBodySchema = z.object({
  title: z.string().max(2000).optional(),
  content: z.string().max(100_000).optional(),
  sort_order: z.number().int().optional(),
})

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string; materialId: string }> },
) {
  try {
    const { id: projectId, materialId } = await params

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

    const org = await getOrganizationForUser(user.id)
    if (!org) return Response.json({ error: 'Not found' }, { status: 404 })

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
    const parsed = patchBodySchema.safeParse(body)
    if (!parsed.success) {
      return Response.json({ error: parsed.error.errors[0]?.message ?? 'Invalid input' }, { status: 400 })
    }

    const { material, error } = await updateProjectMaterial(materialId, projectId, org.id, parsed.data)
    if (error === 'Not found' || !material) {
      return Response.json({ error: 'Not found' }, { status: 404 })
    }
    if (error) {
      return Response.json({ error }, { status: 500 })
    }

    return Response.json({ material })
  } catch (error) {
    console.error('[projects/[id]/materials/[materialId] PATCH]', error)
    return Response.json({ error: 'Internal error' }, { status: 500 })
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string; materialId: string }> },
) {
  try {
    const { id: projectId, materialId } = await params

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

    const org = await getOrganizationForUser(user.id)
    if (!org) return Response.json({ error: 'Not found' }, { status: 404 })

    const db = createServiceClient()
    const { data: project } = await db
      .from('projects')
      .select('id')
      .eq('id', projectId)
      .eq('organization_id', org.id)
      .is('deleted_at', null)
      .maybeSingle()

    if (!project) return Response.json({ error: 'Not found' }, { status: 404 })

    const { error, notFound } = await deleteProjectMaterial(materialId, projectId, org.id)
    if (notFound) {
      return Response.json({ error: 'Not found' }, { status: 404 })
    }
    if (error) {
      return Response.json({ error }, { status: 500 })
    }

    return Response.json({ success: true })
  } catch (error) {
    console.error('[projects/[id]/materials/[materialId] DELETE]', error)
    return Response.json({ error: 'Internal error' }, { status: 500 })
  }
}
