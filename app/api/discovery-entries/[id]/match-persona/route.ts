import Anthropic from '@anthropic-ai/sdk'
import { DEFAULT_MODEL } from '@/lib/ai/models'
import { createClient } from '@/lib/supabase/server'
import { createUntypedServiceClient } from '@/lib/supabase/service'
import { getOrganizationForUser } from '@/lib/queries/organizations'
import { getDiscoveryEntryById } from '@/lib/queries/discovery-entries'
import { getPersonas } from '@/lib/queries/personas'
import { buildPersonaMatchPrompt, type PersonaMatchResult } from '@/lib/ai/prompts'

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

    const apiKey = process.env.ANTHROPIC_API_KEY
    if (!apiKey) return Response.json({ error: 'AI not configured' }, { status: 500 })

    const [entry, personas] = await Promise.all([
      getDiscoveryEntryById(id, org.id),
      getPersonas(org.id),
    ])

    if (!entry) return Response.json({ error: 'Not found' }, { status: 404 })

    if (personas.length === 0) {
      return Response.json(
        { error: 'No personas found. Add at least one persona in Company → Personas before assessing.' },
        { status: 422 },
      )
    }

    // Build insights from structured fields on the entry
    const insights: Array<{ content: string; category: string; impact: string }> = []
    if (entry.jtbd) insights.push({ content: entry.jtbd, category: 'jtbd', impact: 'high' })
    if (entry.key_quote_1) insights.push({ content: entry.key_quote_1, category: 'quote', impact: 'medium' })
    if (entry.key_quote_2) insights.push({ content: entry.key_quote_2, category: 'quote', impact: 'medium' })
    if (entry.key_quote_3) insights.push({ content: entry.key_quote_3, category: 'quote', impact: 'medium' })
    if (entry.sentiment) insights.push({ content: `Overall sentiment: ${entry.sentiment}`, category: 'sentiment', impact: 'low' })
    if (entry.wtp_signal && entry.wtp_signal !== 'none') {
      insights.push({ content: `Willingness to pay signal: ${entry.wtp_signal}`, category: 'buying_intent', impact: 'high' })
    }

    const prompt = buildPersonaMatchPrompt({
      contactName: entry.participant ?? 'Anonymous',
      contactSegment: entry.user_segment,
      contactNotes: entry.raw_content,
      insights,
      recentComms: [],
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

    // Validate matched persona actually belongs to this org
    const matchedPersona =
      result.matched_persona_id
        ? personas.find((p) => p.id === result.matched_persona_id) ?? null
        : null

    const db = createUntypedServiceClient()
    const { error: updateError } = await db
      .from('discovery_entries')
      .update({
        persona_id: matchedPersona?.id ?? null,
        persona_match_name: matchedPersona?.name ?? null,
        persona_match_score: result.score,
        persona_match_reasoning: result.reasoning,
        persona_matched_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .eq('organization_id', org.id)

    if (updateError) {
      console.error('[discovery/match-persona] DB update error', updateError)
      return Response.json({ error: 'Failed to save match' }, { status: 500 })
    }

    return Response.json({
      match: {
        persona_id: matchedPersona?.id ?? null,
        persona_name: matchedPersona?.name ?? null,
        persona_match_name: matchedPersona?.name ?? null,
        score: result.score,
        reasoning: result.reasoning,
      },
      suggest_new_persona: result.suggest_new_persona,
      new_persona_draft: result.new_persona_draft ?? null,
    })
  } catch (error) {
    console.error('[discovery-entries/match-persona POST]', error)
    return Response.json({ error: 'Internal error' }, { status: 500 })
  }
}
