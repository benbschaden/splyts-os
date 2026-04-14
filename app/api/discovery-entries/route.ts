import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { getOrganizationForUser } from '@/lib/queries/organizations'
import { createDiscoveryEntry } from '@/lib/queries/discovery-entries'
import { indexContent } from '@/lib/indexing/index-content'

const createSchema = z.object({
  project_id: z.string().uuid(),
  entry_type: z.enum(['interview', 'review', 'survey', 'observation', 'email']),
  source: z.string().max(500).nullable().optional(),
  entry_date: z.string().nullable().optional(),
  raw_content: z.string().min(1, 'Content is required').max(100000),
  sentiment: z.enum(['positive', 'neutral', 'negative', 'mixed']).nullable().optional(),
  tags: z.array(z.string().max(100)).max(20).default([]),
  include_in_ai: z.boolean().default(false),
  user_segment: z.enum(['new', 'active', 'power', 'churned', 'free', 'paid', 'prospect']).nullable().optional(),
  key_quote_1: z.string().max(2000).nullable().optional(),
  key_quote_2: z.string().max(2000).nullable().optional(),
  key_quote_3: z.string().max(2000).nullable().optional(),
  jtbd: z.string().max(2000).nullable().optional(),
  star_rating: z.number().int().min(1).max(5).nullable().optional(),
  platform: z.enum(['app_store', 'product_hunt', 'g2', 'reddit', 'twitter', 'other']).nullable().optional(),
  source_material_id: z.string().uuid().nullable().optional(),
  study_id: z.string().uuid().nullable().optional(),
  participant: z.string().max(200).nullable().optional(),
  // Audio + speaker metrics
  audio_url: z.string().nullable().optional(),
  diarized_transcript: z.unknown().nullable().optional(),
  interviewer_talk_pct: z.number().nullable().optional(),
  interviewee_talk_pct: z.number().nullable().optional(),
  interviewer_wpm: z.number().nullable().optional(),
  interviewee_wpm: z.number().nullable().optional(),
  interviewer_turns: z.number().int().nullable().optional(),
  interviewee_turns: z.number().int().nullable().optional(),
  total_interruptions: z.number().int().nullable().optional(),
  ijl_median_s: z.number().nullable().optional(),
  ijl_mean_s: z.number().nullable().optional(),
  isr_pct: z.number().nullable().optional(),
  spr_pct: z.number().nullable().optional(),
  // AI content signals
  wtp_signal: z.enum(['strong', 'moderate', 'weak', 'none']).nullable().optional(),
  wtp_price_points: z.array(z.number()).nullable().optional(),
  problem_severity: z.number().int().min(1).max(5).nullable().optional(),
  adoption_willingness: z.number().int().min(1).max(5).nullable().optional(),
  discussion_notes: z.string().nullable().optional(),
})

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

    const org = await getOrganizationForUser(user.id)
    if (!org) return Response.json({ error: 'Not found' }, { status: 404 })

    const body = await request.json()
    const parsed = createSchema.safeParse(body)
    if (!parsed.success) {
      return Response.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 })
    }

    const d = parsed.data
    const { entry, error } = await createDiscoveryEntry({
      organizationId: org.id,
      projectId: d.project_id,
      userId: user.id,
      entry_type: d.entry_type,
      source: d.source ?? null,
      entry_date: d.entry_date ?? null,
      raw_content: d.raw_content,
      sentiment: d.sentiment ?? null,
      tags: d.tags,
      include_in_ai: d.include_in_ai,
      user_segment: d.user_segment ?? null,
      key_quote_1: d.key_quote_1 ?? null,
      key_quote_2: d.key_quote_2 ?? null,
      key_quote_3: d.key_quote_3 ?? null,
      jtbd: d.jtbd ?? null,
      star_rating: d.star_rating ?? null,
      platform: d.platform ?? null,
      source_material_id: d.source_material_id ?? null,
      study_id: d.study_id ?? null,
      participant: d.participant ?? null,
      // Audio + speaker metrics
      audio_url: d.audio_url ?? null,
      diarized_transcript: d.diarized_transcript ?? null,
      interviewer_talk_pct: d.interviewer_talk_pct ?? null,
      interviewee_talk_pct: d.interviewee_talk_pct ?? null,
      interviewer_wpm: d.interviewer_wpm ?? null,
      interviewee_wpm: d.interviewee_wpm ?? null,
      interviewer_turns: d.interviewer_turns ?? null,
      interviewee_turns: d.interviewee_turns ?? null,
      total_interruptions: d.total_interruptions ?? null,
      ijl_median_s: d.ijl_median_s ?? null,
      ijl_mean_s: d.ijl_mean_s ?? null,
      isr_pct: d.isr_pct ?? null,
      spr_pct: d.spr_pct ?? null,
      // AI content signals
      wtp_signal: d.wtp_signal ?? null,
      wtp_price_points: d.wtp_price_points ?? null,
      problem_severity: d.problem_severity ?? null,
      adoption_willingness: d.adoption_willingness ?? null,
      discussion_notes: d.discussion_notes ?? null,
    })

    if (error || !entry) return Response.json({ error: 'Failed to create entry' }, { status: 500 })

    indexContent('discovery_entry', entry, org.id).catch(err =>
      console.error('[content-index] Index failed:', err)
    )

    return Response.json({ data: entry }, { status: 201 })
  } catch {
    return Response.json({ error: 'Internal error' }, { status: 500 })
  }
}
