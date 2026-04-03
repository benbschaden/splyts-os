import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { getOrganizationForUser } from '@/lib/queries/organizations'
import { getPersonas } from '@/lib/queries/personas'
import {
  getKnowledgeFilesWithText,
} from '@/lib/queries/company-knowledge'
import { buildGeneratePersonaPrompt, type GeneratedPersona } from '@/lib/ai/prompts'

export async function POST(_request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

    const org = await getOrganizationForUser(user.id)
    if (!org) return Response.json({ error: 'Not found' }, { status: 404 })

    const apiKey = process.env.ANTHROPIC_API_KEY
    if (!apiKey) return Response.json({ error: 'AI not configured' }, { status: 500 })

    const service = createServiceClient()

    const [{ data: filesRaw }, existingPersonas] = await Promise.all([
      getKnowledgeFilesWithText(service, org.id),
      getPersonas(org.id),
    ])

    const knowledgeDocs = (filesRaw ?? [])
      .filter((f): f is typeof f & { processed_text: string } => f.processed_text !== null)
      .map((f) => ({ fileName: f.file_name, text: f.processed_text }))

    if (knowledgeDocs.length === 0) {
      return Response.json(
        { error: 'No knowledge documents found. Upload files in Company → Knowledge first.' },
        { status: 422 },
      )
    }

    const prompt = buildGeneratePersonaPrompt({
      knowledgeDocs,
      existingPersonaNames: existingPersonas.map((p) => p.name),
    })

    const anthropic = new Anthropic({ apiKey })
    const message = await anthropic.messages.create({
      model: 'claude-opus-4-5',
      max_tokens: 8000,
      messages: [{ role: 'user', content: prompt }],
    })

    const textBlock = message.content.find((b) => b.type === 'text')
    if (!textBlock || textBlock.type !== 'text') {
      return Response.json({ error: 'Generation failed — no response from AI' }, { status: 500 })
    }

    const raw = textBlock.text.trim()
    const jsonStart = raw.indexOf('{')
    const jsonEnd = raw.lastIndexOf('}')
    if (jsonStart === -1 || jsonEnd === -1) {
      return Response.json({ error: 'Generation failed — could not parse AI response' }, { status: 500 })
    }

    // Response is a JSON array — find the outermost [ … ]
    const arrStart = raw.indexOf('[')
    const arrEnd = raw.lastIndexOf(']')
    if (arrStart === -1 || arrEnd === -1) {
      return Response.json({ error: 'Generation failed — could not parse AI response' }, { status: 500 })
    }

    let results: GeneratedPersona[]
    try {
      results = JSON.parse(raw.slice(arrStart, arrEnd + 1)) as GeneratedPersona[]
    } catch {
      return Response.json({ error: 'Generation failed — invalid AI response' }, { status: 500 })
    }

    if (!Array.isArray(results) || results.length === 0) {
      return Response.json({ error: 'Generation failed — no personas returned' }, { status: 500 })
    }

    // Filter out any items missing a name
    const valid = results.filter((p) => typeof p.name === 'string' && p.name.trim())

    if (valid.length === 0) {
      return Response.json({ error: 'Generation failed — no valid personas in response' }, { status: 500 })
    }

    return Response.json({ personas: valid })
  } catch (error) {
    console.error('[personas/generate POST]', error)
    return Response.json({ error: 'Internal error' }, { status: 500 })
  }
}
