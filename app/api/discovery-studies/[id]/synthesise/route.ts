import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { getOrganizationForUser } from '@/lib/queries/organizations'
import { getDiscoveryEntries, getEntryAnalysisExtras } from '@/lib/queries/discovery-entries'
import { updateDiscoveryStudy } from '@/lib/queries/discovery-studies'
import { getChunksForEntry } from '@/lib/queries/discovery-chunks'
import { analyseEntry, synthesiseStudy } from '@/lib/discovery/pipeline'
import { createUntypedServiceClient } from '@/lib/supabase/service'

export const maxDuration = 300

const schema = z.object({
  model_id: z.string().optional(),
  available_tags: z.array(z.string()).max(50).default([]),
})

/**
 * POST /api/discovery-studies/[id]/synthesise
 *
 * Replaces the old single-call synthesis (which sent a 500-char excerpt of
 * each entry) with a digest-based reduce-2 step. Per-entry digests come from
 * the chunked pipeline (`analyseEntry`); any included entry that has not yet
 * been analysed is analysed first as part of this synthesis run.
 *
 * A `discovery_study_synthesis_runs` row is created at start and finalised
 * with the resulting Markdown plus provenance counts.
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  try {
    const { id: studyId } = await params

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

    const org = await getOrganizationForUser(user.id)
    if (!org) return Response.json({ error: 'Not found' }, { status: 404 })

    const body = await request.json().catch(() => ({}))
    const parsed = schema.safeParse(body)
    if (!parsed.success) {
      return Response.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 })
    }

    const { model_id: modelId, available_tags: availableTags } = parsed.data

    // 1. Fetch the study (untyped because discovery_studies isn't in generated types yet).
    const db = createUntypedServiceClient()
    const { data: studyData, error: studyError } = await db
      .from('discovery_studies')
      .select('id, name, goal, method, notes_markdown, project_id, organization_id')
      .eq('id', studyId)
      .eq('organization_id', org.id)
      .is('deleted_at', null)
      .single()

    if (studyError || !studyData) {
      return Response.json({ error: 'Not found' }, { status: 404 })
    }

    const study = studyData as {
      id: string
      name: string
      goal: string | null
      method: string | null
      notes_markdown: string | null
      project_id: string
      organization_id: string
    }

    // 2. Find all entries belonging to this study.
    const allEntries = await getDiscoveryEntries(study.project_id, org.id)
    const studyEntries = allEntries.filter((e) => e.study_id === studyId)
    if (studyEntries.length === 0) {
      return Response.json({ error: 'No entries in this study to synthesise' }, { status: 400 })
    }

    // 3. Ensure every entry has a verified digest. Run the chunk pipeline for
    //    any entry that hasn't been analysed yet. Sequential to stay inside
    //    the Vercel function timeout for studies with many unanalysed entries.
    const enriched: Array<{
      entry: (typeof studyEntries)[number]
      analysis_markdown: string | null
      chunks_consulted: number
      quotes_dropped: number
    }> = []

    for (const entry of studyEntries) {
      const extras = await getEntryAnalysisExtras(entry.id, org.id)
      let analysisMarkdown = extras?.analysis_markdown ?? null

      let chunks = await getChunksForEntry(entry.id, org.id)
      const allSucceeded = chunks.length > 0 && chunks.every((c) => c.status === 'succeeded')
      const hasDigest = !!analysisMarkdown && allSucceeded

      if (!hasDigest) {
        const result = await analyseEntry({
          entryId: entry.id,
          organizationId: org.id,
          rawContent: entry.raw_content,
          entryType: entry.entry_type,
          participant: entry.participant,
          contextNotes: entry.context_notes ?? null,
          studyGoal: study.goal,
          availableTags,
          modelId,
          reuseIfHashMatches: true,
        })
        analysisMarkdown = result.digest.analysis_markdown
        chunks = await getChunksForEntry(entry.id, org.id)
      }

      const chunksConsulted = chunks.length
      const quotesDropped = chunks.reduce(
        (sum, c) => sum + (c.verification_stats?.total_quotes_dropped ?? 0),
        0,
      )

      enriched.push({
        entry,
        analysis_markdown: analysisMarkdown,
        chunks_consulted: chunksConsulted,
        quotes_dropped: quotesDropped,
      })
    }

    // 4. Run the cross-entry synthesis (reduce-2). This persists a synthesis run.
    const synthRes = await synthesiseStudy({
      studyId: study.id,
      organizationId: org.id,
      userId: user.id,
      studyName: study.name,
      studyGoal: study.goal,
      method: study.method,
      notesMarkdown: study.notes_markdown,
      modelId,
      entries: enriched.map((row) => {
        const e = row.entry
        return {
          entry_id: e.id,
          participant: e.participant,
          entry_type: e.entry_type,
          sentiment: e.sentiment,
          tags: e.tags ?? [],
          key_quote_1: e.key_quote_1,
          key_quote_2: e.key_quote_2,
          key_quote_3: e.key_quote_3,
          jtbd: e.jtbd,
          wtp_signal: e.wtp_signal ?? null,
          wtp_price_points: (e.wtp_price_points as number[] | null) ?? [],
          problem_severity: e.problem_severity ?? null,
          adoption_willingness: e.adoption_willingness ?? null,
          analysis_markdown: row.analysis_markdown,
          context_notes: e.context_notes ?? null,
          chunks_consulted: row.chunks_consulted,
          quotes_dropped: row.quotes_dropped,
        }
      }),
    })

    // 5. Save the synthesis report onto the study's analysis_markdown field.
    const { study: updated, error: saveError } = await updateDiscoveryStudy(
      study.id,
      org.id,
      { analysis_markdown: synthRes.analysis_markdown },
    )

    if (saveError || !updated) {
      return Response.json(
        { error: 'Synthesis succeeded but failed to save to the study' },
        { status: 500 },
      )
    }

    return Response.json({
      data: {
        analysis_markdown: synthRes.analysis_markdown,
        run: {
          id: synthRes.run_id,
          entries_included: synthRes.entries_included,
          chunks_consulted: synthRes.chunks_consulted,
          quotes_dropped: synthRes.quotes_dropped,
        },
      },
    })
  } catch (err) {
    console.error('[study synthesise] Unexpected error:', err)
    return Response.json(
      { error: err instanceof Error ? err.message : 'Internal error' },
      { status: 500 },
    )
  }
}
