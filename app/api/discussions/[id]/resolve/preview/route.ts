import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@/lib/supabase/server'
import { getOrganizationForUser } from '@/lib/queries/organizations'
import { getDiscussionById, getDiscussionMessages } from '@/lib/queries/discussions'
import { buildDiscussionResolutionPrompt } from '@/lib/ai/prompts'
import { DEFAULT_MODEL } from '@/lib/ai/models'

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

    const org = await getOrganizationForUser(user.id)
    if (!org) return Response.json({ error: 'Not found' }, { status: 404 })

    const discussion = await getDiscussionById(id, org.id)
    if (!discussion) return Response.json({ error: 'Not found' }, { status: 404 })
    if (discussion.status === 'resolved') {
      return Response.json({ error: 'Already resolved' }, { status: 422 })
    }

    const messages = await getDiscussionMessages(id, org.id)
    if (messages.length === 0) {
      return Response.json({ error: 'No messages to summarise' }, { status: 422 })
    }

    const messageStream = messages
      .map((m) => `[${m.created_at.slice(0, 10)}] ${m.user_id}: ${m.content}`)
      .join('\n\n')

    const prompt = buildDiscussionResolutionPrompt({
      title: discussion.title,
      messageStream,
    })

    const apiKey = process.env.ANTHROPIC_API_KEY
    if (!apiKey) return Response.json({ error: 'AI not configured' }, { status: 503 })

    const anthropic = new Anthropic({ apiKey })
    const response = await anthropic.messages.create({
      model: DEFAULT_MODEL.id,
      max_tokens: 2048,
      messages: [{ role: 'user', content: prompt }],
    })

    const textBlock = response.content.find((b) => b.type === 'text')
    if (!textBlock || textBlock.type !== 'text') {
      return Response.json({ error: 'AI generation failed' }, { status: 500 })
    }

    let parsed: {
      summary: string
      decisions: string[]
      learnings: string[]
      nextSteps: string[]
    }
    try {
      parsed = JSON.parse(textBlock.text.trim())
    } catch {
      return Response.json({ error: 'AI returned invalid response' }, { status: 500 })
    }

    return Response.json({
      summary: parsed.summary ?? '',
      decisions: Array.isArray(parsed.decisions) ? parsed.decisions : [],
      learnings: Array.isArray(parsed.learnings) ? parsed.learnings : [],
      nextSteps: Array.isArray(parsed.nextSteps) ? parsed.nextSteps : [],
    })
  } catch {
    return Response.json({ error: 'Internal error' }, { status: 500 })
  }
}
