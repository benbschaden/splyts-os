import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { getOrganizationForUser } from '@/lib/queries/organizations'
import { getDiscoveryEntryById } from '@/lib/queries/discovery-entries'
import { analyseEntry, analyseEntryTransient } from '@/lib/discovery/pipeline'

export const maxDuration = 300

/**
 * POST /api/discovery-entries/analyse
 *
 * Two modes:
 *
 * 1. **Saved-entry mode** — body: `{ entry_id, available_tags?, model_id? }`.
 *    Runs the full chunk → map → verify → reduce pipeline against the entry's
 *    persisted `raw_content`, persists chunks + verified findings, and writes
 *    the entry digest back to `discovery_entries.analysis_*` columns.
 *
 * 2. **Transient mode** — body: `{ raw_content, entry_type, available_tags?, ... }`.
 *    Runs the same pipeline in memory without persisting chunks. This keeps the
 *    new-entry drawer flow working: the drawer calls analyse BEFORE the entry
 *    is saved.
 *
 * Returns the structured digest fields the drawer consumes today, plus
 * `analysis_markdown` and provenance counts.
 */

const savedEntrySchema = z.object({
  entry_id: z.string().uuid(),
  available_tags: z.array(z.string()).max(50).default([]),
  model_id: z.string().optional(),
})

const transientSchema = z.object({
  raw_content: z.string().min(1).max(1_000_000),
  entry_type: z.enum(['interview', 'review', 'survey', 'observation', 'email']),
  available_tags: z.array(z.string()).max(50).default([]),
  participant: z.string().nullable().optional().default(null),
  context_notes: z.string().nullable().optional().default(null),
  study_goal: z.string().nullable().optional().default(null),
  model_id: z.string().optional(),
})

export async function POST(request: Request): Promise<Response> {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

    const org = await getOrganizationForUser(user.id)
    if (!org) return Response.json({ error: 'Not found' }, { status: 404 })

    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>

    // Saved-entry mode is preferred; pick it when entry_id is present.
    if (typeof body.entry_id === 'string') {
      const parsed = savedEntrySchema.safeParse(body)
      if (!parsed.success) {
        return Response.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 })
      }

      const entry = await getDiscoveryEntryById(parsed.data.entry_id, org.id)
      if (!entry) return Response.json({ error: 'Not found' }, { status: 404 })

      // Resolve study goal (best effort) — we don't block analyse if absent.
      const studyGoal = await getStudyGoal(org.id, entry.study_id)

      const result = await analyseEntry({
        entryId: entry.id,
        organizationId: org.id,
        rawContent: entry.raw_content,
        entryType: entry.entry_type,
        participant: entry.participant,
        contextNotes: entry.context_notes ?? null,
        studyGoal,
        availableTags: parsed.data.available_tags,
        modelId: parsed.data.model_id,
      })

      return Response.json({
        data: { ...result.digest, provenance: result.provenance },
      })
    }

    // Transient mode: in-memory pipeline, nothing persisted.
    const parsed = transientSchema.safeParse(body)
    if (!parsed.success) {
      return Response.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 })
    }

    const result = await analyseEntryTransient({
      organizationId: org.id,
      rawContent: parsed.data.raw_content,
      entryType: parsed.data.entry_type,
      participant: parsed.data.participant,
      contextNotes: parsed.data.context_notes,
      studyGoal: parsed.data.study_goal,
      availableTags: parsed.data.available_tags,
      modelId: parsed.data.model_id,
    })

    return Response.json({
      data: { ...result.digest, provenance: result.provenance },
    })
  } catch (err) {
    console.error('[discovery analyse] Unexpected error:', err)
    return Response.json(
      { error: err instanceof Error ? err.message : 'Internal error' },
      { status: 500 },
    )
  }
}

async function getStudyGoal(orgId: string, studyId: string | null): Promise<string | null> {
  if (!studyId) return null
  // Avoid an extra import of getDiscoveryStudies; fetch the goal field directly.
  const { createUntypedServiceClient } = await import('@/lib/supabase/service')
  const supabase = createUntypedServiceClient()
  const { data, error } = await supabase
    .from('discovery_studies')
    .select('goal')
    .eq('id', studyId)
    .eq('organization_id', orgId)
    .is('deleted_at', null)
    .maybeSingle()
  if (error || !data) return null
  return (data as { goal: string | null }).goal
}
