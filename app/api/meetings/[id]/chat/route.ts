import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { getOrganizationForUser } from '@/lib/queries/organizations'
import { getMeetingById } from '@/lib/queries/meetings'
import { getBrandContext } from '@/lib/queries/brand-context'
import { getBusinessPlan } from '@/lib/queries/business-plan'
import { getPersonas } from '@/lib/queries/personas'
import { getProductContext } from '@/lib/queries/product-context'
import { getAiVisibleProductFeatures } from '@/lib/queries/product-features'
import { getActiveGoalPeriod } from '@/lib/queries/goal-periods'
import { getAiVisibleCompetitors } from '@/lib/queries/competitors'
import { getAiVisibleNarratives } from '@/lib/queries/brand-narratives'
import { getTerminologyForAi } from '@/lib/queries/terminology'
import { buildMeetingChatSystemPrompt } from '@/lib/ai/prompts'
import { DEFAULT_MODEL, getModelById } from '@/lib/ai/models'
import { runMeetingChatCompletion } from '@/lib/ai/meeting-chat'
import { BUSINESS_PLAN_SECTIONS, type BusinessPlanSections, getAiVisibleKeys } from '@/lib/company/business-plan-sections'
import { PRODUCT_SECTIONS, type ProductSections } from '@/lib/company/product-sections'
import type { PersonaRow } from '@/lib/queries/personas'
import type { CompetitorRow } from '@/lib/queries/competitors'
import type { BrandNarrativeRow } from '@/lib/queries/brand-narratives'
import type { TerminologyRow } from '@/lib/queries/terminology'
import type { ProductFeatureRow } from '@/lib/queries/product-features'
import type { GoalPeriodWithGoals } from '@/lib/queries/goal-periods'

const TRANSCRIPT_MAX = 120_000

const chatSchema = z.object({
  model_id: z.string().optional(),
  messages: z
    .array(
      z.object({
        role: z.enum(['user', 'assistant']),
        content: z.string().min(1).max(48_000),
      }),
    )
    .min(1)
    .max(40),
})

function buildBusinessPlanText(sections: BusinessPlanSections): string {
  const visible = getAiVisibleKeys(sections)
  const filled = BUSINESS_PLAN_SECTIONS
    .filter((s) => visible.has(s.key) && (sections[s.key] ?? '').trim())
    .map((s) => `${s.label}: ${sections[s.key].trim()}`)
  return filled.join('\n')
}

function buildPersonasText(personas: PersonaRow[]): string {
  const visible = personas.filter((p) => p.include_in_ai)
  if (visible.length === 0) return ''
  return visible.map((p) => {
    const parts: string[] = [`Persona: ${p.name}`]
    if (p.tagline) parts.push(`Summary: ${p.tagline}`)
    const demo = [p.age_range, p.job_title, p.industry, p.company_size, p.location].filter(Boolean)
    if (demo.length) parts.push(`Demographics: ${demo.join(', ')}`)
    if (p.goals) parts.push(`Goals: ${p.goals}`)
    if (p.frustrations) parts.push(`Frustrations: ${p.frustrations}`)
    if (p.motivations) parts.push(`Motivations: ${p.motivations}`)
    return parts.join('\n')
  }).join('\n\n')
}

function buildProductText(sections: ProductSections | null): string {
  if (!sections) return ''
  return PRODUCT_SECTIONS
    .filter((s) => s.aiVisibleByDefault && (sections[s.key] ?? '').trim())
    .map((s) => `${s.label}: ${sections[s.key].trim()}`)
    .join('\n')
}

function buildFeaturesText(features: ProductFeatureRow[]): string {
  const visible = features.filter((f) => f.include_in_ai)
  if (visible.length === 0) return ''
  return visible.map((f) => {
    let line = `- ${f.name}`
    if (f.tagline) line += `: ${f.tagline}`
    if (f.status !== 'live') line += ` (${f.status})`
    return line
  }).join('\n')
}

function buildGoalsText(period: GoalPeriodWithGoals | null): string {
  if (!period) return ''
  const parts: string[] = [`Period: ${period.period_label}`]
  if (period.focus_areas?.trim()) parts.push(`Focus: ${period.focus_areas.trim()}`)
  if (period.goals.length > 0) {
    parts.push(period.goals.map((g) => `- ${g.title}${g.description ? `: ${g.description}` : ''}`).join('\n'))
  }
  return parts.join('\n')
}

function buildCompetitorsText(competitors: CompetitorRow[]): string {
  const visible = competitors.filter((c) => c.include_in_ai)
  if (visible.length === 0) return ''
  return visible.map((c) => {
    const parts: string[] = [`Competitor: ${c.name}`]
    if (c.positioning) parts.push(`Positioning: ${c.positioning}`)
    if (c.strengths) parts.push(`Strengths: ${c.strengths}`)
    if (c.weaknesses) parts.push(`Weaknesses: ${c.weaknesses}`)
    return parts.join('\n')
  }).join('\n\n')
}

function buildNarrativesText(narratives: BrandNarrativeRow[]): string {
  const visible = narratives.filter((n) => n.include_in_ai)
  if (visible.length === 0) return ''
  return visible.map((n) => `${n.title}: ${n.narrative}`).join('\n')
}

function buildTerminologyText(terms: TerminologyRow[]): string {
  if (terms.length === 0) return ''
  return terms.map((t) => `Always say "${t.preferred}"${t.avoid ? `, never say "${t.avoid}"` : ''}`).join('\n')
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: meetingId } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

    const org = await getOrganizationForUser(user.id)
    if (!org) return Response.json({ error: 'Not found' }, { status: 404 })

    const meeting = await getMeetingById(meetingId, org.id, user.id)
    if (!meeting) return Response.json({ error: 'Not found' }, { status: 404 })

    if (!meeting.processed_at) {
      return Response.json(
        { error: 'Process the meeting before using Discuss' },
        { status: 400 },
      )
    }

    const body = await request.json()
    const parsed = chatSchema.safeParse(body)
    if (!parsed.success) {
      return Response.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 })
    }

    const model = (parsed.data.model_id ? getModelById(parsed.data.model_id) : null) ?? DEFAULT_MODEL

    // Load all company context in parallel — same sources as the main Assistant
    const [
      brand,
      businessPlan,
      personas,
      productContext,
      productFeatures,
      currentGoals,
      competitors,
      narratives,
      terminology,
    ] = await Promise.all([
      getBrandContext(org.id),
      getBusinessPlan(org.id),
      getPersonas(org.id),
      getProductContext(org.id),
      getAiVisibleProductFeatures(org.id),
      getActiveGoalPeriod(org.id),
      getAiVisibleCompetitors(org.id),
      getAiVisibleNarratives(org.id),
      getTerminologyForAi(org.id),
    ])

    const transcriptExcerpt =
      meeting.raw_transcript.length > TRANSCRIPT_MAX
        ? `${meeting.raw_transcript.slice(0, TRANSCRIPT_MAX)}\n\n[…transcript truncated…]`
        : meeting.raw_transcript

    const systemPrompt = buildMeetingChatSystemPrompt({
      brand:
        brand && brand.mission && brand.company_name
          ? {
              company_name: brand.company_name,
              mission: brand.mission,
              vision: brand.vision,
              north_star: brand.north_star,
              voice: brand.voice,
              tone: brand.tone,
              pillars: brand.pillars,
              target_audience: brand.target_audience,
              values: brand.values,
              guardrails: brand.guardrails,
            }
          : null,
      meeting: {
        title: meeting.title,
        meetingDate: meeting.meeting_date,
        summary: meeting.processed_summary,
        decisionsJson: JSON.stringify(meeting.extracted_decisions ?? [], null, 2),
        actionItemsJson: JSON.stringify(meeting.extracted_action_items ?? [], null, 2),
        openQuestionsJson: JSON.stringify(meeting.extracted_open_questions ?? [], null, 2),
        transcriptExcerpt,
      },
      businessPlanText: buildBusinessPlanText(businessPlan?.sections ?? ({} as BusinessPlanSections)),
      personasText: buildPersonasText(personas),
      productText: buildProductText(productContext?.sections ?? null),
      featuresText: buildFeaturesText(productFeatures),
      goalsText: buildGoalsText(currentGoals),
      competitorsText: buildCompetitorsText(competitors),
      narrativesText: buildNarrativesText(narratives),
      terminologyText: buildTerminologyText(terminology),
    })

    let assistantContent: string
    try {
      assistantContent = await runMeetingChatCompletion({
        model,
        systemPrompt,
        messages: parsed.data.messages,
      })
    } catch (err) {
      console.error('[meetings/chat]', err)
      const msg = err instanceof Error ? err.message : ''
      if (msg.includes('not configured')) {
        return Response.json({ error: 'AI provider is not configured' }, { status: 503 })
      }
      return Response.json({ error: 'Generation failed' }, { status: 500 })
    }

    if (!assistantContent) {
      return Response.json({ error: 'Empty response from model' }, { status: 502 })
    }

    return Response.json({
      data: {
        content: assistantContent,
        model_id: model.id,
      },
    })
  } catch (err) {
    console.error('[meetings/chat] unexpected', err)
    return Response.json({ error: 'Internal error' }, { status: 500 })
  }
}
