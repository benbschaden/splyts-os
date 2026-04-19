import Anthropic from '@anthropic-ai/sdk'
import { DEFAULT_MODEL } from '@/lib/ai/models'
import { createClient } from '@/lib/supabase/server'
import { getOrganizationForUser } from '@/lib/queries/organizations'
import { getChatSessionById, getChatMessages } from '@/lib/queries/chat'
import { buildExtractInsightsPrompt, type ExtractedInsightDraft } from '@/lib/ai/prompts'

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

    const apiKey = process.env.ANTHROPIC_API_KEY
    if (!apiKey) return Response.json({ error: 'AI not configured' }, { status: 500 })

    const messages = await getChatMessages(id)
    if (messages.length === 0) {
      return Response.json({ error: 'No conversation to extract from' }, { status: 400 })
    }

    const config = session.context_config
    const contactId = config.customer_hub_contact_id ?? null
    const segment = config.customer_hub_segment ?? null

    const scope = segment
      ? `the ${segment.replace(/_/g, ' ')} cohort`
      : contactId
        ? 'this contact'
        : 'this conversation'

    const conversationText = messages
      .map((m) => `${m.role === 'user' ? 'You' : 'AI'}: ${m.content}`)
      .join('\n\n')

    const prompt = buildExtractInsightsPrompt({ conversationText, scope })
    const anthropic = new Anthropic({ apiKey, maxRetries: 4 })

    const message = await anthropic.messages.create({
      model: DEFAULT_MODEL.id,
      max_tokens: 2048,
      messages: [{ role: 'user', content: prompt }],
    })

    const textBlock = message.content.find((b) => b.type === 'text')
    if (!textBlock || textBlock.type !== 'text') {
      return Response.json({ error: 'Extraction failed' }, { status: 500 })
    }

    const raw = textBlock.text.trim()
    const jsonStart = raw.indexOf('[')
    const jsonEnd = raw.lastIndexOf(']')
    if (jsonStart === -1 || jsonEnd === -1) {
      return Response.json({ error: 'Extraction failed' }, { status: 500 })
    }

    let parsed: ExtractedInsightDraft[]
    try {
      parsed = JSON.parse(raw.slice(jsonStart, jsonEnd + 1)) as ExtractedInsightDraft[]
    } catch {
      return Response.json({ error: 'Extraction failed' }, { status: 500 })
    }

    const validCategories = new Set(['pain_point', 'feature_request', 'praise', 'objection', 'churn_signal', 'usage_pattern', 'market_insight'])
    const validImpact = new Set(['high', 'medium', 'low'])

    const drafts = parsed
      .filter(
        (item): item is ExtractedInsightDraft =>
          item &&
          typeof item.content === 'string' &&
          item.content.trim().length > 0 &&
          validCategories.has(item.category) &&
          validImpact.has(item.impact),
      )
      .slice(0, 12)

    return Response.json({
      drafts,
      source_contact_id: contactId,
      source_segment: segment,
    })
  } catch (err) {
    console.error('[extract-insights POST]', err)
    return Response.json({ error: 'Internal error' }, { status: 500 })
  }
}
