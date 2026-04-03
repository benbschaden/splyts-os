import { z } from 'zod'
import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@/lib/supabase/server'
import { createUntypedServiceClient } from '@/lib/supabase/service'
import { getOrganizationForUser } from '@/lib/queries/organizations'
import { getCommunicationsForContact } from '@/lib/queries/contact-communications'
import { getBrandContext } from '@/lib/queries/brand-context'
import { buildEmailDraftPrompt, type EmailDraftResult } from '@/lib/ai/prompts'

const schema = z.object({
  purpose: z.string().min(1).max(1000),
  additional_context: z.string().max(10000).optional().default(''),
})

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: contactId } = await params

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

    const org = await getOrganizationForUser(user.id)
    if (!org) return Response.json({ error: 'Not found' }, { status: 404 })

    const body = await request.json()
    const parsed = schema.safeParse(body)
    if (!parsed.success) {
      console.error('[contacts/generate-email] Validation failed:', JSON.stringify(parsed.error.flatten().fieldErrors))
      return Response.json({ error: 'Invalid input', details: parsed.error.flatten().fieldErrors }, { status: 400 })
    }

    const apiKey = process.env.ANTHROPIC_API_KEY
    if (!apiKey) return Response.json({ error: 'AI not configured' }, { status: 500 })

    // Verify contact belongs to this org
    const db = createUntypedServiceClient()
    const { data: contact } = await db
      .from('contacts')
      .select('id, name, segment, email')
      .eq('id', contactId)
      .eq('organization_id', org.id)
      .is('deleted_at', null)
      .maybeSingle()

    if (!contact) return Response.json({ error: 'Not found' }, { status: 404 })

    // Fetch last 10 communications and brand context in parallel
    const [communications, brandContext] = await Promise.all([
      getCommunicationsForContact(contactId, org.id),
      getBrandContext(org.id),
    ])

    const prompt = buildEmailDraftPrompt({
      contactName: contact.name,
      contactSegment: contact.segment,
      communicationHistory: communications.slice(0, 10).map((c) => ({
        direction: c.direction,
        channel: c.channel,
        subject: c.subject,
        content: c.content,
        sent_at: c.sent_at,
      })),
      purpose: parsed.data.purpose,
      additionalContext: parsed.data.additional_context,
      brandVoice: brandContext?.voice ?? '',
      brandTone: brandContext?.tone ?? '',
      companyName: brandContext?.company_name ?? org.name ?? 'the company',
    })

    const anthropic = new Anthropic({ apiKey })
    const message = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 2048,
      messages: [{ role: 'user', content: prompt }],
    })

    const textBlock = message.content.find((b) => b.type === 'text')
    if (!textBlock || textBlock.type !== 'text') {
      return Response.json({ error: 'Generation failed' }, { status: 500 })
    }

    const raw = textBlock.text.trim()
    const jsonStart = raw.indexOf('{')
    const jsonEnd = raw.lastIndexOf('}')
    if (jsonStart === -1 || jsonEnd === -1) {
      return Response.json({ error: 'Generation failed' }, { status: 500 })
    }

    let result: EmailDraftResult
    try {
      result = JSON.parse(raw.slice(jsonStart, jsonEnd + 1)) as EmailDraftResult
    } catch {
      return Response.json({ error: 'Generation failed' }, { status: 500 })
    }

    if (!result.subject || !result.body) {
      return Response.json({ error: 'Generation failed' }, { status: 500 })
    }

    return Response.json({ subject: result.subject, body: result.body })
  } catch (error) {
    console.error('[contacts/generate-email POST]', error)
    return Response.json({ error: 'Internal error' }, { status: 500 })
  }
}
