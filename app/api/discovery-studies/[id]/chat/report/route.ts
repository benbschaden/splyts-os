import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { getOrganizationForUser } from '@/lib/queries/organizations'
import { getChatMessages } from '@/lib/queries/chat'
import { getDiscoveryEntries } from '@/lib/queries/discovery-entries'
import { saveStudyReport } from '@/lib/queries/discovery-studies'
import { buildStudyChatSystemPrompt, type StudyChatEntry } from '@/lib/ai/prompts'
import { DEFAULT_MODEL, getModelById } from '@/lib/ai/models'
import { runMeetingChatCompletion } from '@/lib/ai/meeting-chat'
import { createUntypedServiceClient } from '@/lib/supabase/service'

const schema = z.object({
  model_id: z.string().optional(),
  instruction: z.string().max(2000).optional(),
})

const DEFAULT_INSTRUCTION =
  'Based on our full discussion and all the research transcripts, write a comprehensive research report in clean Markdown. ' +
  'Structure it with: Executive Summary, Key Findings, Themes (with supporting quotes), Signal Summary, Gaps & Contradictions, and Recommended Next Steps. ' +
  'Make it detailed and complete — this is the final deliverable from this study.'

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
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

    const { model_id, instruction } = parsed.data
    const model = (model_id ? getModelById(model_id) : null) ?? DEFAULT_MODEL

    const db = createUntypedServiceClient()

    const { data: studyData, error: studyError } = await db
      .from('discovery_studies')
      .select('id, name, goal, method, notes_markdown, analysis_markdown, chat_session_id, project_id, organization_id')
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
      analysis_markdown: string | null
      chat_session_id: string | null
      project_id: string
      organization_id: string
    }

    const allEntries = await getDiscoveryEntries(study.project_id, org.id)
    const studyEntries = allEntries.filter((e) => e.study_id === studyId)

    const entryDigests: StudyChatEntry[] = studyEntries.map((e) => ({
      participant: e.participant,
      entry_type: e.entry_type,
      sentiment: e.sentiment,
      tags: e.tags ?? [],
      key_quote_1: e.key_quote_1,
      key_quote_2: e.key_quote_2,
      key_quote_3: e.key_quote_3,
      jtbd: e.jtbd,
      context_notes: e.context_notes ?? null,
      discussion_notes: e.discussion_notes ?? null,
      raw_content: e.raw_content ?? '',
    }))

    const systemPrompt = buildStudyChatSystemPrompt({
      studyName: study.name,
      studyGoal: study.goal,
      method: study.method,
      notesMarkdown: study.notes_markdown,
      analysisMarkdown: study.analysis_markdown,
      entries: entryDigests,
    })

    // Include the chat history as context so the report reflects the discussion
    const existingMessages = study.chat_session_id
      ? await getChatMessages(study.chat_session_id)
      : []

    const messageHistory = [
      ...existingMessages.map((m) => ({ role: m.role as 'user' | 'assistant', content: m.content })),
      { role: 'user' as const, content: instruction?.trim() || DEFAULT_INSTRUCTION },
    ]

    let reportMarkdown: string
    try {
      reportMarkdown = await runMeetingChatCompletion({
        model,
        systemPrompt,
        messages: messageHistory,
      })
    } catch (err) {
      console.error('[study/chat/report] AI call failed:', err)
      return Response.json({ error: 'Generation failed. Please try again.' }, { status: 500 })
    }

    if (!reportMarkdown) {
      return Response.json({ error: 'Empty response from model' }, { status: 502 })
    }

    const { study: updated, error: saveError } = await saveStudyReport(studyId, org.id, reportMarkdown)
    if (saveError || !updated) {
      return Response.json({ error: 'Report generated but failed to save' }, { status: 500 })
    }

    return Response.json({ data: { report_markdown: reportMarkdown } })
  } catch (err) {
    console.error('[study/chat/report] unexpected', err)
    return Response.json({ error: 'Internal error' }, { status: 500 })
  }
}
