import { z } from 'zod'
import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@/lib/supabase/server'
import { getOrganizationForUser } from '@/lib/queries/organizations'
import { buildDiscussionSummarizePrompt } from '@/lib/ai/prompts'
import { CHAT_MESSAGE_CONTENT_MAX_CHARS, DISCUSS_AI_MAX_OUTPUT_TOKENS } from '@/lib/ai/chat-limits'
import { DEFAULT_MODEL } from '@/lib/ai/models'
import { createUntypedServiceClient } from '@/lib/supabase/service'

const messageSchema = z.object({
  role: z.enum(['user', 'assistant']),
  content: z.string().min(1).max(CHAT_MESSAGE_CONTENT_MAX_CHARS),
})

const requestSchema = z.object({
  messages: z.array(messageSchema).min(1).max(50),
})

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  try {
    const { id } = await params

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

    const org = await getOrganizationForUser(user.id)
    if (!org) return Response.json({ error: 'Not found' }, { status: 404 })

    const body = await request.json()
    const parsed = requestSchema.safeParse(body)
    if (!parsed.success) {
      return Response.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 })
    }

    const serviceClient = createUntypedServiceClient()
    const { data: entryData, error: entryError } = await serviceClient
      .from('discovery_entries')
      .select('entry_type, participant, organization_id')
      .eq('id', id)
      .eq('organization_id', org.id)
      .is('deleted_at', null)
      .single()

    if (entryError || !entryData) {
      return Response.json({ error: 'Not found' }, { status: 404 })
    }

    const entry = entryData as { entry_type: string; participant: string | null; organization_id: string }

    const systemPrompt = buildDiscussionSummarizePrompt({
      entryType: entry.entry_type,
      participant: entry.participant,
      messages: parsed.data.messages,
    })

    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY!, maxRetries: 4 })
    const response = await anthropic.messages.create({
      model: DEFAULT_MODEL.id,
      max_tokens: DISCUSS_AI_MAX_OUTPUT_TOKENS,
      messages: [{ role: 'user', content: systemPrompt }],
    })

    const summary = response.content
      .filter((c) => c.type === 'text')
      .map((c) => (c as { type: 'text'; text: string }).text)
      .join('')
      .trim()

    // Append to discussion_notes (prepend with date header so multiple summaries stack)
    const { data: currentEntry } = await serviceClient
      .from('discovery_entries')
      .select('discussion_notes')
      .eq('id', id)
      .single()

    const existing = (currentEntry as { discussion_notes: string | null } | null)?.discussion_notes?.trim() ?? ''
    const dateHeader = `## Summary — ${new Date().toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}`
    const combined = existing ? `${existing}\n\n---\n\n${dateHeader}\n\n${summary}` : `${dateHeader}\n\n${summary}`

    const { error: saveError } = await serviceClient
      .from('discovery_entries')
      .update({ discussion_notes: combined, updated_at: new Date().toISOString() })
      .eq('id', id)
      .eq('organization_id', org.id)

    if (saveError) {
      console.error('[discuss/summarize] Failed to save discussion notes:', saveError)
      return Response.json({ error: 'Summary generated but failed to save' }, { status: 500 })
    }

    return Response.json({ data: { summary, discussion_notes: combined } })
  } catch (err) {
    console.error('[discuss/summarize] Unexpected error:', err)
    return Response.json({ error: 'Internal error' }, { status: 500 })
  }
}
