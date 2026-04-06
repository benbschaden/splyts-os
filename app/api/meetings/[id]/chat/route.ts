import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { getOrganizationForUser } from '@/lib/queries/organizations'
import { getMeetingById } from '@/lib/queries/meetings'
import { getBrandContext } from '@/lib/queries/brand-context'
import { buildMeetingChatSystemPrompt } from '@/lib/ai/prompts'
import { DEFAULT_MODEL, getModelById } from '@/lib/ai/models'
import { runMeetingChatCompletion } from '@/lib/ai/meeting-chat'

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
    const brand = await getBrandContext(org.id)

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
