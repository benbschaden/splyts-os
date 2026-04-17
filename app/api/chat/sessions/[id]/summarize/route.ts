import Anthropic from '@anthropic-ai/sdk'
import { DEFAULT_MODEL } from '@/lib/ai/models'
import { createClient } from '@/lib/supabase/server'
import { getOrganizationForUser } from '@/lib/queries/organizations'
import { getChatSessionById, getChatMessages } from '@/lib/queries/chat'
import { getBrandContext } from '@/lib/queries/brand-context'
import { buildContactChatSummaryPrompt } from '@/lib/ai/prompts'
import {
  getContactChatSummaryForSession,
  upsertContactChatSummary,
} from '@/lib/queries/contact-chat-summaries'

export async function GET(
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

    const session = await getChatSessionById(id, user.id)
    if (!session || session.organization_id !== org.id) {
      return Response.json({ error: 'Not found' }, { status: 404 })
    }

    const summary = await getContactChatSummaryForSession(id, org.id)
    return Response.json({ summary })
  } catch (err) {
    console.error('[summarize GET]', err)
    return Response.json({ error: 'Internal error' }, { status: 500 })
  }
}

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

    const session = await getChatSessionById(id, user.id)
    if (!session || session.organization_id !== org.id) {
      return Response.json({ error: 'Not found' }, { status: 404 })
    }

    const config = session.context_config
    const contactId = config.customer_hub_contact_id ?? null
    const segment = config.customer_hub_segment ?? null

    if (!contactId && !segment) {
      return Response.json(
        { error: 'This chat is not linked to a contact or segment' },
        { status: 422 },
      )
    }

    const apiKey = process.env.ANTHROPIC_API_KEY
    if (!apiKey) return Response.json({ error: 'AI not configured' }, { status: 500 })

    const [messages, brand] = await Promise.all([
      getChatMessages(id),
      getBrandContext(org.id),
    ])

    if (messages.length === 0) {
      return Response.json({ error: 'No conversation to summarize' }, { status: 400 })
    }

    const scope = segment
      ? `the ${segment.replace(/_/g, ' ')} cohort`
      : 'this contact'

    const conversationText = messages
      .map((m) => `${m.role === 'user' ? 'You' : 'AI'}: ${m.content}`)
      .join('\n\n')

    const prompt = buildContactChatSummaryPrompt({ conversationText, scope, brand })
    const anthropic = new Anthropic({ apiKey })

    let summaryContent: string
    try {
      const response = await anthropic.messages.create({
        model: DEFAULT_MODEL.id,
        max_tokens: 8192,
        messages: [{ role: 'user', content: prompt }],
      })
      const textBlock = response.content.find((b) => b.type === 'text')
      if (!textBlock || textBlock.type !== 'text') {
        return Response.json({ error: 'Summary generation failed. Please try again.' }, { status: 500 })
      }
      summaryContent = textBlock.text.trim()
    } catch {
      return Response.json({ error: 'Summary generation failed. Please try again.' }, { status: 500 })
    }

    const firstUserMessage = messages.find((m) => m.role === 'user')
    const titleSnippet = firstUserMessage
      ? firstUserMessage.content.slice(0, 60)
      : 'conversation'
    const title = `Chat summary: ${titleSnippet}`

    const { summary, error: saveError } = await upsertContactChatSummary({
      organizationId: org.id,
      sessionId: id,
      contactId,
      segment,
      title,
      content: summaryContent,
      createdBy: user.id,
    })

    if (saveError || !summary) {
      return Response.json({ error: 'Summary generated but failed to save' }, { status: 500 })
    }

    return Response.json({ summary }, { status: 201 })
  } catch (err) {
    console.error('[summarize POST]', err)
    return Response.json({ error: 'Internal error' }, { status: 500 })
  }
}
