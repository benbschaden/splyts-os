import { z } from 'zod'
import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { getOrganizationForUser } from '@/lib/queries/organizations'
import { getKnowledgeFilesWithText } from '@/lib/queries/company-knowledge'
import { getBrandContext } from '@/lib/queries/brand-context'
import { BUSINESS_PLAN_SECTIONS } from '@/lib/company/business-plan-sections'
import { DEFAULT_MODEL } from '@/lib/ai/models'
import { buildSectionChatSystemPrompt } from '@/lib/ai/prompts'

const messageSchema = z.object({
  role: z.enum(['user', 'assistant']),
  content: z.string().min(1).max(10000),
})

const schema = z.object({
  sectionKey: z.string().min(1).max(100),
  sectionText: z.string().max(10000).default(''),
  allSections: z.record(z.string(), z.string()).default({}),
  messages: z.array(messageSchema).min(1).max(50),
})

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

    const org = await getOrganizationForUser(user.id)
    if (!org) return Response.json({ error: 'Not found' }, { status: 404 })

    const body = await request.json()
    const parsed = schema.safeParse(body)
    if (!parsed.success) {
      return Response.json(
        { error: 'Invalid input', details: parsed.error.flatten().fieldErrors },
        { status: 400 },
      )
    }

    const { sectionKey, sectionText, allSections, messages } = parsed.data

    const section = BUSINESS_PLAN_SECTIONS.find((s) => s.key === sectionKey)
    if (!section) {
      return Response.json({ error: 'Unknown section' }, { status: 400 })
    }

    const service = createServiceClient()
    const [knowledgeResult, brand] = await Promise.all([
      getKnowledgeFilesWithText(service, org.id),
      getBrandContext(org.id),
    ])

    const knowledgeDocs = (knowledgeResult.data ?? [])
      .filter((f): f is typeof f & { processed_text: string } => f.processed_text !== null)
      .map((f) => ({ fileName: f.file_name, text: f.processed_text }))

    const otherSections = BUSINESS_PLAN_SECTIONS
      .filter((s) => s.key !== sectionKey)
      .map((s) => ({ label: s.label, text: allSections[s.key] ?? '' }))

    const systemPrompt = buildSectionChatSystemPrompt({
      sectionKey,
      sectionLabel: section.label,
      sectionDescription: section.description,
      sectionText,
      otherSections,
      knowledgeDocs,
      brand: brand
        ? { company_name: brand.company_name, mission: brand.mission, voice: brand.voice }
        : null,
    })

    const apiKey = process.env.ANTHROPIC_API_KEY
    if (!apiKey) {
      return Response.json({ error: 'AI is not configured' }, { status: 503 })
    }

    const anthropic = new Anthropic({ apiKey })
    const response = await anthropic.messages.create({
      model: DEFAULT_MODEL.id,
      max_tokens: 2048,
      system: systemPrompt,
      messages: messages.map((m) => ({ role: m.role, content: m.content })),
    })

    const textBlock = response.content.find((b) => b.type === 'text')
    if (!textBlock || textBlock.type !== 'text') {
      return Response.json({ error: 'AI response failed. Please try again.' }, { status: 500 })
    }

    return Response.json({ response: textBlock.text.trim() })
  } catch (err) {
    console.error('[company/section-chat POST]', err)
    return Response.json({ error: 'Chat request failed. Please try again.' }, { status: 500 })
  }
}
