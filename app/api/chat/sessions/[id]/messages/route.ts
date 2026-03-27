import { z } from 'zod'
import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@/lib/supabase/server'
import { getOrganizationForUser } from '@/lib/queries/organizations'
import { getChatSessionById, getChatMessages, addChatMessage, updateChatSessionTitle } from '@/lib/queries/chat'
import { getBrandContext } from '@/lib/queries/brand-context'
import { getBusinessPlan } from '@/lib/queries/business-plan'
import { getPersonas } from '@/lib/queries/personas'
import { buildChatSystemPrompt } from '@/lib/ai/prompts'
import { DEFAULT_MODEL } from '@/lib/ai/models'

const schema = z.object({
  content: z.string().min(1, 'Message cannot be empty').max(10000),
})

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
    const { brand: includeBrand, business_plan: includeBusinessPlan, personas: includePersonas } = session.context_config

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

    // Build conversation history for Claude
    const messageHistory: Array<{ role: 'user' | 'assistant'; content: string }> = [
      ...existingMessages.map((m) => ({ role: m.role, content: m.content })),
      { role: 'user', content },
    ]

    const apiKey = process.env.ANTHROPIC_API_KEY
    if (!apiKey) {
      return Response.json({ error: 'AI is not configured' }, { status: 503 })
    }

    const anthropic = new Anthropic({ apiKey })
    let assistantContent: string

    try {
      const response = await anthropic.messages.create({
        model: DEFAULT_MODEL.id,
        max_tokens: 2048,
        system: systemPrompt,
        messages: messageHistory,
      })
      const textBlock = response.content.find((b) => b.type === 'text')
      if (!textBlock || textBlock.type !== 'text') {
        return Response.json({ error: 'AI response failed. Please try again.' }, { status: 500 })
      }
      assistantContent = textBlock.text.trim()
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
