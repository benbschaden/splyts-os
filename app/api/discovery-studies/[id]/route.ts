import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { getOrganizationForUser } from '@/lib/queries/organizations'
import { updateDiscoveryStudy, deleteDiscoveryStudy } from '@/lib/queries/discovery-studies'
import { indexContent, removeFromIndex } from '@/lib/indexing/index-content'

const patchSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  goal: z.string().max(1000).nullable().optional(),
  method: z
    .enum(['interview', 'review', 'survey', 'observation', 'email', 'mixed'])
    .nullable()
    .optional(),
  script_markdown: z.string().max(50000).nullable().optional(),
  analysis_markdown: z.string().max(50000).nullable().optional(),
  notes_markdown: z.string().max(50000).nullable().optional(),
  status: z.enum(['active', 'complete', 'archived']).optional(),
})

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

    const org = await getOrganizationForUser(user.id)
    if (!org) return Response.json({ error: 'Not found' }, { status: 404 })

    const body = await request.json()
    const parsed = patchSchema.safeParse(body)
    if (!parsed.success) {
      return Response.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 })
    }

    const { study, error } = await updateDiscoveryStudy(id, org.id, parsed.data)
    if (error || !study) return Response.json({ error: 'Failed to update study' }, { status: 500 })

    indexContent('discovery_study', study, org.id).catch(err =>
      console.error('[content-index] Index failed:', err)
    )

    return Response.json({ data: study })
  } catch {
    return Response.json({ error: 'Internal error' }, { status: 500 })
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

    const org = await getOrganizationForUser(user.id)
    if (!org) return Response.json({ error: 'Not found' }, { status: 404 })

    const { error } = await deleteDiscoveryStudy(id, org.id)
    if (error) return Response.json({ error }, { status: 500 })

    removeFromIndex('discovery_study', id).catch(err =>
      console.error('[content-index] Remove failed:', err)
    )

    return new Response(null, { status: 204 })
  } catch {
    return Response.json({ error: 'Internal error' }, { status: 500 })
  }
}
