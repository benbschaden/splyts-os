import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { getOrganizationForUser } from '@/lib/queries/organizations'
import { getProductContext, upsertProductContext } from '@/lib/queries/product-context'
import { PRODUCT_SECTIONS } from '@/lib/company/product-sections'
import { indexContent } from '@/lib/indexing/index-content'
import { isAtLeastAdmin } from '@/lib/auth/roles'

const patchSchema = z.object({
  sections: z.record(z.string()),
})

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

    const org = await getOrganizationForUser(user.id)
    if (!org) return Response.json({ error: 'Not found' }, { status: 404 })

    const productContext = await getProductContext(org.id)
    return Response.json({ data: productContext })
  } catch {
    return Response.json({ error: 'Internal error' }, { status: 500 })
  }
}

export async function PATCH(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

    const org = await getOrganizationForUser(user.id)
    if (!org) return Response.json({ error: 'Not found' }, { status: 404 })
    if (!isAtLeastAdmin(org.role)) return Response.json({ error: 'Not found' }, { status: 404 })

    const body = await request.json()
    const parsed = patchSchema.safeParse(body)
    if (!parsed.success) return Response.json({ error: 'Invalid input' }, { status: 400 })

    // Only allow known section keys
    const validKeys = new Set(PRODUCT_SECTIONS.map((s) => s.key))
    const filteredSections: Record<string, string> = {}
    for (const [k, v] of Object.entries(parsed.data.sections)) {
      if (validKeys.has(k)) filteredSections[k] = v
    }

    const { data, error } = await upsertProductContext(org.id, filteredSections, user.id)
    if (error || !data) return Response.json({ error }, { status: 500 })

    indexContent('product_context', data, org.id).catch(err =>
      console.error('[content-index] Index failed:', err)
    )

    return Response.json({ data })
  } catch {
    return Response.json({ error: 'Internal error' }, { status: 500 })
  }
}
