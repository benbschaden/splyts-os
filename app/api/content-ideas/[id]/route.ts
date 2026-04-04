import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { getOrganizationForUser } from '@/lib/queries/organizations'
import { updateContentIdea, deleteContentIdea } from '@/lib/queries/content-ideas'
import { indexContent, removeFromIndex } from '@/lib/indexing/index-content'

const patchSchema = z.object({
  title: z.string().min(1).max(500).optional(),
  description: z.string().max(2000).nullable().optional(),
  content_type_id: z.string().uuid().nullable().optional(),
  platform_owner: z.enum(['author', 'company']).optional(),
  status: z.enum(['idea', 'in_progress', 'done']).optional(),
})

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
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
      return Response.json({ error: parsed.error.errors[0].message }, { status: 400 })
    }

    const { idea, error } = await updateContentIdea(id, org.id, parsed.data)
    if (error || !idea) return Response.json({ error: 'Not found' }, { status: 404 })

    indexContent('content_idea', idea, org.id).catch(err =>
      console.error('[content-index] Index failed:', err)
    )

    return Response.json({ idea })
  } catch {
    return Response.json({ error: 'Internal error' }, { status: 500 })
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  try {
    const { id } = await params

    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

    const org = await getOrganizationForUser(user.id)
    if (!org) return Response.json({ error: 'Not found' }, { status: 404 })

    const { error } = await deleteContentIdea(id, org.id)
    if (error) return Response.json({ error: 'Not found' }, { status: 404 })

    removeFromIndex('content_idea', id).catch(err =>
      console.error('[content-index] Remove failed:', err)
    )

    return new Response(null, { status: 204 })
  } catch {
    return Response.json({ error: 'Internal error' }, { status: 500 })
  }
}
