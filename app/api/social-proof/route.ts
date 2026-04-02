import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { getOrganizationForUser } from '@/lib/queries/organizations'
import { getSocialProof, createSocialProof } from '@/lib/queries/social-proof'
import { indexContent } from '@/lib/indexing/index-content'

const proofTypeEnum = z.enum(['testimonial', 'case_study', 'metric', 'award'])

const createSchema = z.object({
  proof_type: proofTypeEnum,
  quote: z.string().max(50000).nullable().optional(),
  attribution: z.string().max(2000).nullable().optional(),
  company: z.string().max(2000).nullable().optional(),
  metric_value: z.string().max(500).nullable().optional(),
  metric_label: z.string().max(2000).nullable().optional(),
  tags: z.array(z.string().max(200)).max(50).optional(),
  approved: z.boolean().default(false),
  include_in_ai: z.boolean().default(true),
})

function normalizeOptionalString(value: string | null | undefined): string | null {
  if (value == null) return null
  const t = value.trim()
  return t.length === 0 ? null : t
}

function normalizeTags(tags: string[] | undefined): string[] {
  if (!tags?.length) return []
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

export async function GET() {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

    const org = await getOrganizationForUser(user.id)
    if (!org) return Response.json({ error: 'Not found' }, { status: 404 })

    const items = await getSocialProof(org.id)
    return Response.json({ data: items })
  } catch {
    return Response.json({ error: 'Internal error' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

    const org = await getOrganizationForUser(user.id)
    if (!org) return Response.json({ error: 'Not found' }, { status: 404 })
    if (org.role !== 'admin') return Response.json({ error: 'Not found' }, { status: 404 })

    const body = await request.json()
    const parsed = createSchema.safeParse(body)
    if (!parsed.success) {
      return Response.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 })
    }

    const d = parsed.data
    const { socialProof, error } = await createSocialProof({
      organizationId: org.id,
      proofType: d.proof_type,
      quote: normalizeOptionalString(d.quote ?? undefined),
      attribution: normalizeOptionalString(d.attribution ?? undefined),
      company: normalizeOptionalString(d.company ?? undefined),
      metricValue: normalizeOptionalString(d.metric_value ?? undefined),
      metricLabel: normalizeOptionalString(d.metric_label ?? undefined),
      tags: normalizeTags(d.tags),
      approved: d.approved,
      includeInAi: d.include_in_ai,
      userId: user.id,
    })

    if (error || !socialProof) return Response.json({ error }, { status: 500 })

    indexContent('social_proof', socialProof, org.id).catch(err =>
      console.error('[content-index] Index failed:', err)
    )

    return Response.json({ data: socialProof }, { status: 201 })
  } catch {
    return Response.json({ error: 'Internal error' }, { status: 500 })
  }
}
