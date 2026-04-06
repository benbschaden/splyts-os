import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@/lib/supabase/server'
import { getOrganizationForUser } from '@/lib/queries/organizations'
import {
  getMeetingById,
  getAttendeesForMeeting,
  saveMeetingProcessingResult,
  type ExtractedDecision,
  type ExtractedActionItem,
  type ExtractedQuestion,
  type SuggestedProjectLink,
} from '@/lib/queries/meetings'
import { buildMeetingProcessingPrompt } from '@/lib/ai/prompts'
import { createUntypedServiceClient } from '@/lib/supabase/service'
import { z } from 'zod'

const DecisionSchema = z.object({
  text: z.string(),
  owner: z.string().nullable().default(null),
})

const ActionItemSchema = z.object({
  text: z.string(),
  assignee_name: z.string().nullable().default(null),
})

const QuestionSchema = z.object({
  text: z.string(),
})

const SuggestedLinkSchema = z.object({
  project_id: z.string(),
  project_name: z.string(),
  rationale: z.string(),
  relevant_decisions: z.array(z.number()).default([]),
  relevant_actions: z.array(z.number()).default([]),
})

const ProcessingResultSchema = z.object({
  summary: z.string(),
  decisions: z.array(DecisionSchema).default([]),
  action_items: z.array(ActionItemSchema).default([]),
  open_questions: z.array(QuestionSchema).default([]),
  project_suggestions: z.array(SuggestedLinkSchema).default([]),
})

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

    const org = await getOrganizationForUser(user.id)
    if (!org) return Response.json({ error: 'Not found' }, { status: 404 })

    const meeting = await getMeetingById(id, org.id, user.id)
    if (!meeting) return Response.json({ error: 'Not found' }, { status: 404 })

    // Only the creator can trigger processing
    if (meeting.created_by !== user.id) {
      return Response.json({ error: 'Not found' }, { status: 404 })
    }

    // Fetch attendees and org projects for context
    const [attendees, orgProjectsResult] = await Promise.all([
      getAttendeesForMeeting(id),
      createUntypedServiceClient()
        .from('projects')
        .select('id, name, description')
        .eq('organization_id', org.id)
        .eq('status', 'active')
        .is('deleted_at', null)
        .neq('project_type', 'tool')
        .order('name', { ascending: true }),
    ])

    const orgProjects = (orgProjectsResult.data ?? []) as Array<{
      id: string
      name: string
      description: string | null
    }>

    const prompt = buildMeetingProcessingPrompt({
      transcript: meeting.raw_transcript,
      attendees: attendees.map((a) => ({
        user_id: a.user_id,
        full_name: a.full_name,
      })),
      orgProjects,
    })

    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })
    const response = await anthropic.messages.create({
      model: 'claude-opus-4-6',
      max_tokens: 4096,
      messages: [{ role: 'user', content: prompt }],
    })

    const rawText = response.content
      .filter((c) => c.type === 'text')
      .map((c) => (c as { type: 'text'; text: string }).text)
      .join('')
      .trim()

    // Strip optional markdown fences if the model adds them
    const jsonText = rawText.startsWith('```')
      ? rawText.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '')
      : rawText

    let parsed: ReturnType<typeof ProcessingResultSchema.parse>
    try {
      parsed = ProcessingResultSchema.parse(JSON.parse(jsonText))
    } catch (parseErr) {
      console.error('[meetings/process] Failed to parse AI response:', parseErr, rawText)
      return Response.json({ error: 'Failed to parse AI response' }, { status: 502 })
    }

    // Validate project_ids against actual org projects so the AI cannot hallucinate IDs
    const validProjectIds = new Set(orgProjects.map((p) => p.id))
    const validatedSuggestions: SuggestedProjectLink[] = parsed.project_suggestions
      .filter((s) => validProjectIds.has(s.project_id))
      .map((s) => ({
        project_id: s.project_id,
        project_name: s.project_name,
        rationale: s.rationale,
        relevant_decisions: s.relevant_decisions,
        relevant_actions: s.relevant_actions,
      }))

    const { error: saveError } = await saveMeetingProcessingResult({
      meetingId: id,
      orgId: org.id,
      processedSummary: parsed.summary,
      extractedDecisions: parsed.decisions as ExtractedDecision[],
      extractedActionItems: parsed.action_items as ExtractedActionItem[],
      extractedOpenQuestions: parsed.open_questions as ExtractedQuestion[],
      suggestedProjectLinks: validatedSuggestions,
    })

    if (saveError) {
      return Response.json({ error: saveError }, { status: 500 })
    }

    // Return the updated meeting
    const updated = await getMeetingById(id, org.id, user.id)
    return Response.json({ data: updated })
  } catch (err) {
    console.error('[meetings/process] Unexpected error:', err)
    return Response.json({ error: 'Internal error' }, { status: 500 })
  }
}
