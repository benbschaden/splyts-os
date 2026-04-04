import Anthropic from '@anthropic-ai/sdk'
import { DEFAULT_MODEL } from '@/lib/ai/models'
import { createClient } from '@/lib/supabase/server'
import { createUntypedServiceClient } from '@/lib/supabase/service'
import { getOrganizationForUser } from '@/lib/queries/organizations'
import { getContactById } from '@/lib/queries/contacts'
import { getPersonas } from '@/lib/queries/personas'
import { getCommunicationsForContact } from '@/lib/queries/contact-communications'
import { getInsightsForContact } from '@/lib/queries/customer-insights'
import { buildPersonaMatchPrompt, type PersonaMatchResult } from '@/lib/ai/prompts'

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
    if (!apiKey) return Response.json({ error: 'AI not configured' }, { status: 500 })

    const [contact, personas, communications, insights] = await Promise.all([
      getContactById(contactId, org.id),
      getPersonas(org.id),
      getCommunicationsForContact(contactId, org.id),
      getInsightsForContact(contactId, org.id),
    ])

    if (!contact) return Response.json({ error: 'Not found' }, { status: 404 })

    if (personas.length === 0) {
      return Response.json(
        { error: 'No personas found. Add at least one persona in Company → Personas before assessing.' },
        { status: 422 },
      )
    }

    const prompt = buildPersonaMatchPrompt({
      contactName: contact.name,
      contactSegment: contact.segment,
      contactNotes: contact.notes,
      insights: insights.slice(0, 15).map((i) => ({
        content: i.content,
        category: i.category,
        impact: i.impact,
      })),
      recentComms: communications.slice(0, 5).map((c) => ({
        direction: c.direction,
        channel: c.channel,
        content: c.content,
      })),
      personas: personas.map((p) => ({
        id: p.id,
        name: p.name,
        tagline: p.tagline,
        job_title: p.job_title,
        industry: p.industry,
        company_size: p.company_size,
        goals: p.goals,
        frustrations: p.frustrations,
        motivations: p.motivations,
        behaviors: p.behaviors,
        buying_triggers: p.buying_triggers,
        objections: p.objections,
        quote: p.quote,
      })),
    })

    const anthropic = new Anthropic({ apiKey })
    const message = await anthropic.messages.create({
      model: DEFAULT_MODEL.id,
      max_tokens: 2048,
      messages: [{ role: 'user', content: prompt }],
    })

    const textBlock = message.content.find((b) => b.type === 'text')
    if (!textBlock || textBlock.type !== 'text') {
      return Response.json({ error: 'Matching failed — no response from AI' }, { status: 500 })
    }

    const raw = textBlock.text.trim()
    const jsonStart = raw.indexOf('{')
    const jsonEnd = raw.lastIndexOf('}')
    if (jsonStart === -1 || jsonEnd === -1) {
      return Response.json({ error: 'Matching failed — could not parse AI response' }, { status: 500 })
    }

    let result: PersonaMatchResult
    try {
      result = JSON.parse(raw.slice(jsonStart, jsonEnd + 1)) as PersonaMatchResult
    } catch {
      return Response.json({ error: 'Matching failed — invalid AI response' }, { status: 500 })
    }

    if (typeof result.score !== 'number' || typeof result.reasoning !== 'string') {
      return Response.json({ error: 'Matching failed — unexpected response shape' }, { status: 500 })
    }

    // Validate that matched_persona_id actually belongs to this org
    const matchedPersona =
      result.matched_persona_id
        ? personas.find((p) => p.id === result.matched_persona_id) ?? null
        : null

    const db = createUntypedServiceClient()
    const { error: updateError } = await db
      .from('contacts')
      .update({
        persona_id: matchedPersona?.id ?? null,
        persona_match_score: result.score,
        persona_match_reasoning: result.reasoning,
        persona_matched_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', contactId)
      .eq('organization_id', org.id)

    if (updateError) {
      console.error('[match-persona] DB update error', updateError)
      return Response.json({ error: 'Failed to save match' }, { status: 500 })
    }

    return Response.json({
      match: {
        persona_id: matchedPersona?.id ?? null,
        persona_name: matchedPersona?.name ?? null,
        score: result.score,
        reasoning: result.reasoning,
      },
      suggest_new_persona: result.suggest_new_persona,
      new_persona_draft: result.new_persona_draft ?? null,
    })
  } catch (error) {
    console.error('[contacts/match-persona POST]', error)
    return Response.json({ error: 'Internal error' }, { status: 500 })
  }
}
