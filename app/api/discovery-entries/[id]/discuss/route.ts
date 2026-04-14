import { z } from 'zod'
import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@/lib/supabase/server'
import { getOrganizationForUser } from '@/lib/queries/organizations'
import { buildEntryDiscussionPrompt } from '@/lib/ai/prompts'
import { createUntypedServiceClient } from '@/lib/supabase/service'

const messageSchema = z.object({
  role: z.enum(['user', 'assistant']),
  content: z.string().min(1),
})

const requestSchema = z.object({
  messages: z.array(messageSchema).min(1).max(50),
})

type DiscoveryEntryContext = {
  entry_type: string
  participant: string | null
  entry_date: string | null
  raw_content: string
  jtbd: string | null
  key_quote_1: string | null
  key_quote_2: string | null
  key_quote_3: string | null
  sentiment: string | null
  tags: string[]
  organization_id: string
}

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

    // Fetch the entry and verify org ownership
    const serviceClient = createUntypedServiceClient()
    const { data: entryData, error: entryError } = await serviceClient
      .from('discovery_entries')
      .select('entry_type, participant, entry_date, raw_content, jtbd, key_quote_1, key_quote_2, key_quote_3, sentiment, tags, organization_id')
      .eq('id', id)
      .eq('organization_id', org.id)
      .is('deleted_at', null)
      .single()

    if (entryError || !entryData) {
      return Response.json({ error: 'Not found' }, { status: 404 })
    }

    const entry = entryData as DiscoveryEntryContext
    const systemPrompt = buildEntryDiscussionPrompt({ entry: { ...entry, tags: entry.tags ?? [] } })

    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })
    const response = await anthropic.messages.create({
      model: 'claude-opus-4-6',
      max_tokens: 1024,
      system: systemPrompt,
      messages: parsed.data.messages.map((m) => ({
        role: m.role,
        content: m.content,
      })),
    })

    const content = response.content
      .filter((c) => c.type === 'text')
      .map((c) => (c as { type: 'text'; text: string }).text)
      .join('')
      .trim()

    return Response.json({ data: { content } })
  } catch (err) {
    console.error('[discuss] Unexpected error:', err)
    return Response.json({ error: 'Internal error' }, { status: 500 })
  }
}
