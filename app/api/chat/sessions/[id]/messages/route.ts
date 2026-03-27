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

const WEB_SEARCH_TOOL = {
  type: 'web_search_20250305' as const,
  name: 'web_search',
}

async function runAnthropicWithTools(
  anthropic: Anthropic,
  modelId: string,
  systemPrompt: string,
  messageHistory: Anthropic.MessageParam[],
  browserEnabled: boolean,
): Promise<string> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const tools: any[] = browserEnabled ? [WEB_SEARCH_TOOL] : []
  let loopMessages: Anthropic.MessageParam[] = [...messageHistory]
  const MAX_ITERATIONS = 6

  for (let i = 0; i < MAX_ITERATIONS; i++) {
    const response = await anthropic.messages.create({
      model: modelId,
      max_tokens: 2048,
      system: systemPrompt,
      messages: loopMessages,
      ...(tools.length > 0 ? { tools } : {}),
    })

    if (response.stop_reason === 'end_turn') {
      const textBlock = response.content.find((b) => b.type === 'text')
      if (textBlock?.type === 'text') return textBlock.text.trim()
      return ''
    }

    if (response.stop_reason === 'tool_use') {
      // Add assistant message with tool_use blocks
      loopMessages = [...loopMessages, { role: 'assistant', content: response.content }]

      // Build tool_result blocks — for web_search, Anthropic executes the search server-side
      const toolResults: Anthropic.ToolResultBlockParam[] = response.content
        .filter((b): b is Anthropic.ToolUseBlock => b.type === 'tool_use')
        .map((b) => ({
          type: 'tool_result' as const,
          tool_use_id: b.id,
          content: [],
        }))

      loopMessages = [...loopMessages, { role: 'user', content: toolResults }]
      continue
    }

    // max_tokens or other stop — grab any text we have
    const textBlock = response.content.find((b) => b.type === 'text')
    if (textBlock?.type === 'text') return textBlock.text.trim()
    return ''
  }

  return ''
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
      assistantContent = await runAnthropicWithTools(anthropic, model.id, systemPrompt, messageHistory, browserEnabled)
      if (!assistantContent) {
        return Response.json({ error: 'AI response failed. Please try again.' }, { status: 500 })
      }
    } catch {
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
