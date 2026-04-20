import { z } from 'zod'
import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@/lib/supabase/server'
import { getOrganizationForUser } from '@/lib/queries/organizations'
import { getOutputById } from '@/lib/queries/outputs'
import { getBrandContext } from '@/lib/queries/brand-context'
import { CHAT_MESSAGE_CONTENT_MAX_CHARS } from '@/lib/ai/chat-limits'
import { buildOutputChatSystemPrompt } from '@/lib/ai/prompts'
import { DEFAULT_MODEL } from '@/lib/ai/models'

const messageSchema = z.object({
  role: z.enum(['user', 'assistant']),
  content: z.string().min(1).max(CHAT_MESSAGE_CONTENT_MAX_CHARS),
})

const schema = z.object({
  messages: z.array(messageSchema).min(1).max(50),
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

    const output = await getOutputById(id, org.id)
    if (!output) return Response.json({ error: 'Not found' }, { status: 404 })

    const body = await request.json()
    const parsed = schema.safeParse(body)
    if (!parsed.success) {
      return Response.json(
        { error: 'Invalid input', details: parsed.error.flatten().fieldErrors },
        { status: 400 },
      )
    }

    const { messages } = parsed.data

    const brand = await getBrandContext(org.id)

    const outputType = output.content_type_id
      ? output.brief.split(':')[0]?.trim() ?? 'Output'
      : output.brief.split(':')[0]?.trim() ?? 'Output'

    const systemPrompt = buildOutputChatSystemPrompt({
      outputType,
      brief: output.brief,
      content: output.content,
      brand: brand ? { company_name: brand.company_name, voice: brand.voice } : null,
    })

    const apiKey = process.env.ANTHROPIC_API_KEY
    if (!apiKey) {
      return Response.json({ error: 'AI is not configured' }, { status: 503 })
    }

    const anthropic = new Anthropic({ apiKey, maxRetries: 4 })
    const response = await anthropic.messages.create({
      model: DEFAULT_MODEL.id,
      max_tokens: 4096,
      system: systemPrompt,
      messages: messages.map((m) => ({ role: m.role, content: m.content })),
    })

    const textBlock = response.content.find((b) => b.type === 'text')
    if (!textBlock || textBlock.type !== 'text') {
      return Response.json({ error: 'AI response failed. Please try again.' }, { status: 500 })
    }

    return Response.json({ response: textBlock.text.trim() })
  } catch (err) {
    console.error('[outputs/[id]/chat POST]', err)
    return Response.json({ error: 'Chat request failed. Please try again.' }, { status: 500 })
  }
}
