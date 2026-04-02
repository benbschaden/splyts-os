import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { getOrganizationForUser } from '@/lib/queries/organizations'
import { updateSocialProof, deleteSocialProof } from '@/lib/queries/social-proof'
import { indexContent, removeFromIndex } from '@/lib/indexing/index-content'
import { isAtLeastAdmin } from '@/lib/auth/roles'

const proofTypeEnum = z.enum(['testimonial', 'case_study', 'metric', 'award'])

const patchSchema = z.object({
  proof_type: proofTypeEnum.optional(),
  quote: z.string().max(50000).nullable().optional(),
  attribution: z.string().max(2000).nullable().optional(),
  company: z.string().max(2000).nullable().optional(),
  metric_value: z.string().max(500).nullable().optional(),
  metric_label: z.string().max(2000).nullable().optional(),
  tags: z.array(z.string().max(200)).max(50).optional(),
  approved: z.boolean().optional(),
  include_in_ai: z.boolean().optional(),
  sort_order: z.number().int().min(0).max(1_000_000).optional(),
})

function normalizePatchString(value: string | null): string | null {
  if (value === null) return null
  const t = value.trim()
  return t.length === 0 ? null : t
}

function normalizeTags(tags: string[] | undefined): string[] | undefined {
  if (tags === undefined) return undefined
  const seen = new Set<string>()
  const out: string[] = []
  for (const t of tags) {
    const s = t.trim()
    if (!s) continue
    const key = s.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    out.push(s)
  }
  return out
}

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
    if (!isAtLeastAdmin(org.role)) return Response.json({ error: 'Not found' }, { status: 404 })

    const body = await request.json()
    const parsed = patchSchema.safeParse(body)
    if (!parsed.success) {
      return Response.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 })
    }

    const p = parsed.data
    const updates: Parameters<typeof updateSocialProof>[2] = {}

    if (p.proof_type !== undefined) updates.proof_type = p.proof_type
    if (p.quote !== undefined) updates.quote = normalizePatchString(p.quote)
    if (p.attribution !== undefined) updates.attribution = normalizePatchString(p.attribution)
    if (p.company !== undefined) updates.company = normalizePatchString(p.company)
    if (p.metric_value !== undefined) updates.metric_value = normalizePatchString(p.metric_value)
    if (p.metric_label !== undefined) updates.metric_label = normalizePatchString(p.metric_label)
    if (p.tags !== undefined) updates.tags = normalizeTags(p.tags)
    if (p.approved !== undefined) updates.approved = p.approved
    if (p.include_in_ai !== undefined) updates.include_in_ai = p.include_in_ai
    if (p.sort_order !== undefined) updates.sort_order = p.sort_order

    const { socialProof, error } = await updateSocialProof(id, org.id, updates, user.id)
    if (error || !socialProof) return Response.json({ error }, { status: 500 })

    indexContent('social_proof', socialProof, org.id).catch(err =>
      console.error('[content-index] Index failed:', err)
    )

    return Response.json({ data: socialProof })
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
    if (!isAtLeastAdmin(org.role)) return Response.json({ error: 'Not found' }, { status: 404 })

    const { error } = await deleteSocialProof(id, org.id)
    if (error) return Response.json({ error }, { status: 500 })

    removeFromIndex('social_proof', id).catch(err =>
      console.error('[content-index] Remove failed:', err)
    )

    return new Response(null, { status: 204 })
  } catch {
    return Response.json({ error: 'Internal error' }, { status: 500 })
  }
}
