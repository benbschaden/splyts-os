import { createClient } from '@/lib/supabase/server'
import { getOrganizationForUser } from '@/lib/queries/organizations'
import { getContactById } from '@/lib/queries/contacts'
import { createUntypedServiceClient } from '@/lib/supabase/service'
import { buildResponseScanPrompt, type ResponseScanResult } from '@/lib/ai/prompts'
import Anthropic from '@anthropic-ai/sdk'
import { DEFAULT_MODEL } from '@/lib/ai/models'
import { getCommunicationsForContact } from '@/lib/queries/contact-communications'

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: contactId } = await params

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

    const org = await getOrganizationForUser(user.id)
    if (!org) return Response.json({ error: 'Not found' }, { status: 404 })

    const apiKey = process.env.ANTHROPIC_API_KEY
    if (!apiKey) return Response.json({ error: 'AI not configured' }, { status: 503 })

    const [contact, communications] = await Promise.all([
      getContactById(contactId, org.id),
      getCommunicationsForContact(contactId, org.id),
    ])

    if (!contact) return Response.json({ error: 'Not found' }, { status: 404 })

    const prompt = buildResponseScanPrompt({
      contactName: contact.name,
      contactSegment: contact.segment,
      communications: communications.map((c) => ({
        direction: c.direction,
        channel: c.channel,
        subject: c.subject,
        content: c.content,
        sent_at: c.sent_at,
        is_draft: c.is_draft,
      })),
    })

    const anthropic = new Anthropic({ apiKey })
    const message = await anthropic.messages.create({
      model: DEFAULT_MODEL.id,
      max_tokens: 256,
      messages: [{ role: 'user', content: prompt }],
    })

    const textBlock = message.content.find((b) => b.type === 'text')
    if (!textBlock || textBlock.type !== 'text') {
      return Response.json({ error: 'Scan failed — no response from AI' }, { status: 500 })
    }

    const raw = textBlock.text.trim()
    const jsonStart = raw.indexOf('{')
    const jsonEnd = raw.lastIndexOf('}')
    if (jsonStart === -1 || jsonEnd === -1) {
      return Response.json({ error: 'Scan failed — could not parse AI response' }, { status: 500 })
    }

    let result: ResponseScanResult
    try {
      result = JSON.parse(raw.slice(jsonStart, jsonEnd + 1)) as ResponseScanResult
    } catch {
      return Response.json({ error: 'Scan failed — invalid JSON from AI' }, { status: 500 })
    }

    if (result.status !== 'needs_response' && result.status !== 'no_action_needed') {
      return Response.json({ error: 'Scan failed — unexpected status value' }, { status: 500 })
    }

    const db = createUntypedServiceClient()
    const { error: updateError } = await db
      .from('contacts')
      .update({
        response_status: result.status,
        response_status_reason: result.reason ?? null,
        response_status_updated_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', contactId)
      .eq('organization_id', org.id)

    if (updateError) {
      console.error('[scan-response] DB update error', updateError)
      return Response.json({ error: 'Failed to save scan result' }, { status: 500 })
    }

    return Response.json({
      status: result.status,
      reason: result.reason ?? null,
    })
  } catch (error) {
    console.error('[contacts/scan-response POST]', error)
    return Response.json({ error: 'Internal error' }, { status: 500 })
  }
}
