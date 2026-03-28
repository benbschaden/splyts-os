import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { getOrganizationForUser } from '@/lib/queries/organizations'
import { getConflictById, dismissConflict } from '@/lib/queries/company-knowledge'

const schema = z.object({
  trust: z.enum(['a', 'b']).optional(),
})

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

    const org = await getOrganizationForUser(user.id)
    if (!org) return Response.json({ error: 'Not found' }, { status: 404 })

    if (org.role !== 'admin') {
      return Response.json({ error: 'Not found' }, { status: 404 })
    }

    const { id } = await params

    const body = await request.json().catch(() => ({}))
    const parsed = schema.safeParse(body)
    if (!parsed.success) {
      return Response.json({ error: 'Invalid input' }, { status: 400 })
    }
    const { trust } = parsed.data

    let trustPayload: { trustedFileId: string; trustedExcerpt: string } | undefined

    if (trust) {
      const { data: conflict, error: fetchError } = await getConflictById(supabase, id, org.id)
      if (fetchError || !conflict) {
        return Response.json({ error: 'Not found' }, { status: 404 })
      }

      const trustedFileId = trust === 'a' ? conflict.file_id_a : conflict.file_id_b
      const trustedExcerpt = trust === 'a' ? conflict.excerpt_a : conflict.excerpt_b

      if (!trustedExcerpt) {
        return Response.json({ error: 'No excerpt available for this side' }, { status: 400 })
      }

      trustPayload = { trustedFileId, trustedExcerpt }
    }

    const { data, error } = await dismissConflict(supabase, id, org.id, user.id, trustPayload)

    if (error || !data) {
      return Response.json({ error: 'Not found' }, { status: 404 })
    }

    return Response.json({ ok: true })
  } catch (err) {
    console.error('[company-knowledge/conflicts/[id] PATCH]', err)
    return Response.json({ error: 'Internal error' }, { status: 500 })
  }
}
