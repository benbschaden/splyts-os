import { z } from 'zod'
import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@/lib/supabase/server'
import { getOrganizationForUser } from '@/lib/queries/organizations'
import { getChatSessionById, getChatMessages, addChatMessage, updateChatSessionTitle } from '@/lib/queries/chat'
import { getBrandContext } from '@/lib/queries/brand-context'
import { getBusinessPlan } from '@/lib/queries/business-plan'
import { getPersonas } from '@/lib/queries/personas'
import { buildChatSystemPrompt } from '@/lib/ai/prompts'
import { DEFAULT_MODEL, getModelById } from '@/lib/ai/models'

const schema = z.object({
  content: z.string().min(1, 'Message cannot be empty').max(10000),
})

async function runWithBrowser(
  anthropic: Anthropic,
  modelId: string,
  systemPrompt: string,
  messageHistory: Anthropic.MessageParam[],
): Promise<string> {
  // Web search is a beta feature — requires the beta messages API and beta header
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let loopMessages: any[] = [...messageHistory]
  const MAX_ITERATIONS = 6

  for (let i = 0; i < MAX_ITERATIONS; i++) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const response: any = await (anthropic.beta.messages.create as any)({
      betas: ['web-search-2025-03-05'],
      model: modelId,
      max_tokens: 2048,
      system: systemPrompt,
      messages: loopMessages,
      tools: [{ type: 'web_search_20250305', name: 'web_search' }],
    })

    if (response.stop_reason === 'end_turn') {
      const textBlock = response.content.find((b: { type: string }) => b.type === 'text')
      return textBlock?.text?.trim() ?? ''
    }

    if (response.stop_reason === 'tool_use') {
      loopMessages = [...loopMessages, { role: 'assistant', content: response.content }]
      const toolResults = response.content
        .filter((b: { type: string }) => b.type === 'tool_use')
        .map((b: { id: string }) => ({
          type: 'tool_result' as const,
          tool_use_id: b.id,
          content: [],
        }))
      loopMessages = [...loopMessages, { role: 'user', content: toolResults }]
      continue
    }

    const textBlock = response.content.find((b: { type: string }) => b.type === 'text')
    return textBlock?.text?.trim() ?? ''
  }

  return ''
}

async function runWithoutBrowser(
  anthropic: Anthropic,
  modelId: string,
  systemPrompt: string,
  messageHistory: Anthropic.MessageParam[],
): Promise<string> {
  const response = await anthropic.messages.create({
    model: modelId,
    max_tokens: 2048,
    system: systemPrompt,
    messages: messageHistory,
  })
  const textBlock = response.content.find((b) => b.type === 'text')
  return textBlock?.type === 'text' ? textBlock.text.trim() : ''
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

    const org = await getOrganizationForUser(user.id)
    if (!org) return Response.json({ error: 'Not found' }, { status: 404 })

    const session = await getChatSessionById(id, user.id)
    if (!session || session.organization_id !== org.id) {
      return Response.json({ error: 'Not found' }, { status: 404 })
    }

    const body = await request.json()
    const parsed = schema.safeParse(body)
    if (!parsed.success) {
      return Response.json({ error: parsed.error.errors[0].message }, { status: 400 })
    }

    const { content } = parsed.data
    const {
      brand: includeBrand,
      business_plan: includeBusinessPlan,
      personas: includePersonas,
      browser: browserEnabled = false,
    } = session.context_config
    const model = getModelById(session.model_id) ?? DEFAULT_MODEL

    // Fetch company context in parallel based on what's enabled
    const [brand, businessPlan, personas, existingMessages] = await Promise.all([
      includeBrand ? getBrandContext(org.id) : Promise.resolve(null),
      includeBusinessPlan ? getBusinessPlan(org.id) : Promise.resolve(null),
      includePersonas ? getPersonas(org.id) : Promise.resolve([]),
      getChatMessages(id),
    ])

    const systemPrompt = buildChatSystemPrompt({
      brand,
      businessPlanSections: businessPlan?.sections ?? null,
      personas,
      includeBrand,
      includeBusinessPlan,
      includePersonas,
    })

    const messageHistory: Anthropic.MessageParam[] = [
      ...existingMessages.map((m) => ({ role: m.role as 'user' | 'assistant', content: m.content })),
      { role: 'user', content },
    ]

    const apiKey = process.env.ANTHROPIC_API_KEY
    if (!apiKey) {
      return Response.json({ error: 'AI is not configured' }, { status: 503 })
    }

    const anthropic = new Anthropic({ apiKey })
    let assistantContent: string

    try {
      assistantContent = browserEnabled
        ? await runWithBrowser(anthropic, model.id, systemPrompt, messageHistory)
        : await runWithoutBrowser(anthropic, model.id, systemPrompt, messageHistory)

      if (!assistantContent) {
        return Response.json({ error: 'AI response failed. Please try again.' }, { status: 500 })
      }
    } catch (err) {
      console.error('[chat/messages] AI call failed:', err)
      return Response.json({ error: 'AI response failed. Please try again.' }, { status: 500 })
    }

    // Save both messages
    const [userMsg, assistantMsg] = await Promise.all([
      addChatMessage(id, 'user', content),
      addChatMessage(id, 'assistant', assistantContent),
    ])

    if (userMsg.error || assistantMsg.error) {
      console.error('[chat/messages] Failed to save messages')
      return Response.json({ error: 'Failed to save messages' }, { status: 500 })
    }

    // Auto-title the session from the first user message
    if (existingMessages.length === 0) {
      const title = content.length > 60 ? content.slice(0, 57) + '…' : content
      await updateChatSessionTitle(id, user.id, title)
    }

    return Response.json({
      userMessage: userMsg.message,
      assistantMessage: assistantMsg.message,
    }, { status: 201 })
  } catch {
    return Response.json({ error: 'Internal error' }, { status: 500 })
  }
}
