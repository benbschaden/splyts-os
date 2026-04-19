import Anthropic from '@anthropic-ai/sdk'
import { DEFAULT_MODEL } from '@/lib/ai/models'
import { createUntypedServiceClient } from '@/lib/supabase/service'
import { getCommunicationsForContact } from '@/lib/queries/contact-communications'
import { buildResponseScanPrompt, type ResponseScanResult } from '@/lib/ai/prompts'

/**
 * Run the AI response-status scan for a single contact and persist the result.
 * Safe to call fire-and-forget — errors are logged but not thrown.
 */
export async function scanContactResponseStatus(
  contactId: string,
  orgId: string,
  contactName: string,
  contactSegment: string | null,
): Promise<void> {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) return

  try {
    const communications = await getCommunicationsForContact(contactId, orgId)

    const prompt = buildResponseScanPrompt({
      contactName,
      contactSegment,
      communications: communications.map((c) => ({
        direction: c.direction,
        channel: c.channel,
        subject: c.subject,
        content: c.content,
        sent_at: c.sent_at,
        is_draft: c.is_draft,
      })),
    })

    const anthropic = new Anthropic({ apiKey, maxRetries: 4 })
    const message = await anthropic.messages.create({
      model: DEFAULT_MODEL.id,
      max_tokens: 256,
      messages: [{ role: 'user', content: prompt }],
    })

    const textBlock = message.content.find((b) => b.type === 'text')
    if (!textBlock || textBlock.type !== 'text') return

    const raw = textBlock.text.trim()
    const jsonStart = raw.indexOf('{')
    const jsonEnd = raw.lastIndexOf('}')
    if (jsonStart === -1 || jsonEnd === -1) return

    let result: ResponseScanResult
    try {
      result = JSON.parse(raw.slice(jsonStart, jsonEnd + 1)) as ResponseScanResult
    } catch {
      return
    }

    if (result.status !== 'needs_response' && result.status !== 'no_action_needed') return

    const db = createUntypedServiceClient()
    await db
      .from('contacts')
      .update({
        response_status: result.status,
        response_status_reason: result.reason ?? null,
        response_status_updated_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', contactId)
      .eq('organization_id', orgId)
  } catch (err) {
    console.error('[scan-contact-response] Error scanning contact:', contactId, err)
  }
}
