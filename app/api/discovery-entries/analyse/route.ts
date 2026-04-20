import { z } from 'zod'
import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@/lib/supabase/server'
import { getOrganizationForUser } from '@/lib/queries/organizations'
import { buildDiscoveryEntryAnalysisPrompt } from '@/lib/ai/prompts'
import { DEFAULT_MODEL } from '@/lib/ai/models'

const requestSchema = z.object({
  raw_content: z.string().min(1).max(100000),
  entry_type: z.enum(['interview', 'review', 'survey', 'observation', 'email']),
  available_tags: z.array(z.string()).max(50).default([]),
})

const analysisSchema = z.object({
  sentiment: z.enum(['positive', 'neutral', 'negative', 'mixed']),
  tags: z.array(z.string()).default([]),
  key_quote_1: z.string().nullable().default(null),
  key_quote_2: z.string().nullable().default(null),
  key_quote_3: z.string().nullable().default(null),
  jtbd: z.string().nullable().default(null),
  wtp_signal: z.enum(['strong', 'moderate', 'weak', 'none']).default('none'),
  wtp_price_points: z.array(z.number()).default([]),
  problem_severity: z.number().int().min(1).max(5).nullable().default(null),
  adoption_willingness: z.number().int().min(1).max(5).nullable().default(null),
})

export async function POST(request: Request): Promise<Response> {
  try {
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

    const { raw_content, entry_type, available_tags } = parsed.data

    const prompt = buildDiscoveryEntryAnalysisPrompt({ rawContent: raw_content, entryType: entry_type, availableTags: available_tags })

    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY!, maxRetries: 4 })
    const response = await anthropic.messages.create({
      model: DEFAULT_MODEL.id,
      max_tokens: 1024,
      messages: [{ role: 'user', content: prompt }],
    })

    const rawText = response.content
      .filter((c) => c.type === 'text')
      .map((c) => (c as { type: 'text'; text: string }).text)
      .join('')
      .trim()

    const jsonText = rawText.startsWith('```')
      ? rawText.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '')
      : rawText

    let analysisData: ReturnType<typeof analysisSchema.parse>
    try {
      analysisData = analysisSchema.parse(JSON.parse(jsonText))
    } catch (parseErr) {
      console.error('[analyse] Failed to parse AI response:', parseErr, rawText)
      return Response.json({ error: 'Failed to parse AI analysis' }, { status: 502 })
    }

    return Response.json({ data: analysisData })
  } catch (err) {
    console.error('[analyse] Unexpected error:', err)
    return Response.json({ error: 'Internal error' }, { status: 500 })
  }
}
