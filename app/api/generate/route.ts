import { z } from 'zod'
import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@/lib/supabase/server'
import { getOrganizationForUser } from '@/lib/queries/organizations'
import { getBrandContext } from '@/lib/queries/brand-context'
import { createServiceClient } from '@/lib/supabase/service'
import { createOutput } from '@/lib/queries/outputs'
import { getModelById, DEFAULT_MODEL } from '@/lib/ai/models'

const schema = z.object({
  projectId: z.string().uuid(),
  contentTypeId: z.string().uuid(),
  authorId: z.string(), // 'company' or a UUID
  brief: z.string().min(1, 'Brief is required'),
  modelId: z.string().optional(),
})

function buildPrompt(params: {
  brand: {
    company_name: string
    mission: string
    vision: string
    north_star: string
    voice: string
    tone: string
    pillars: string
    target_audience: string
    values: string | null
  }
  basePrompt: string
  customRules: string
  author: {
    type: 'company'
  } | {
    type: 'named'
    name: string
    role: string | null
    voice: string | null
    tone: string | null
    writing_style: string | null
    personal_pillars: string | null
    platform_notes: string | null
  }
  brief: string
}): string {
  const { brand, basePrompt, customRules, author, brief } = params

  const lines: string[] = []

  lines.push(`You are a professional content writer for ${brand.company_name}.`)
  lines.push('')
  lines.push('[BRAND CONTEXT]')
  lines.push(`Company: ${brand.company_name}`)
  lines.push(`Mission: ${brand.mission}`)
  lines.push(`Vision: ${brand.vision}`)
  lines.push(`North Star: ${brand.north_star}`)
  lines.push(`Brand voice: ${brand.voice}`)
  lines.push(`Brand tone: ${brand.tone}`)
  lines.push(`Pillars: ${brand.pillars}`)
  lines.push(`Target audience: ${brand.target_audience}`)
  if (brand.values) lines.push(`Values: ${brand.values}`)

  lines.push('')
  lines.push('[CONTENT STRUCTURE]')
  lines.push(basePrompt)

  lines.push('')
  lines.push('[CONTENT RULES]')
  lines.push(customRules)

  lines.push('')
  if (author.type === 'company') {
    lines.push('[AUTHOR]')
    lines.push('Write in the brand voice and tone defined above. This is a company post — do not write in a personal, first-person style.')
  } else {
    lines.push('[AUTHOR]')
    lines.push("Write in this specific author's voice, not the generic brand voice.")
    lines.push(`Name: ${author.name}`)
    if (author.role) lines.push(`Role: ${author.role}`)
    if (author.voice) lines.push(`Voice: ${author.voice}`)
    if (author.tone) lines.push(`Tone: ${author.tone}`)
    if (author.writing_style) lines.push(`Writing style: ${author.writing_style}`)
    if (author.personal_pillars) lines.push(`Personal pillars: ${author.personal_pillars}`)
    if (author.platform_notes) lines.push(`Platform notes: ${author.platform_notes}`)
    lines.push('The brand context above (mission, vision, north star, pillars, audience) still applies — but the voice, tone, and style must match this author.')
  }

  lines.push('')
  lines.push('[BRIEF]')
  lines.push(brief)

  lines.push('')
  lines.push('---')
  lines.push('Generate the content now. Output only the content itself — no preamble, no explanation, no metadata.')

  return lines.join('\n')
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const org = await getOrganizationForUser(user.id)
  if (!org) return Response.json({ error: 'Organisation not found' }, { status: 404 })

  const body = await request.json()
  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return Response.json({ error: parsed.error.errors[0].message }, { status: 400 })
  }

  const { projectId, contentTypeId, authorId, brief, modelId } = parsed.data

  // Resolve model — fall back to default if not provided or unrecognised
  const model = (modelId ? getModelById(modelId) : null) ?? DEFAULT_MODEL

  // Verify project belongs to this org
  const db = createServiceClient()
  const { data: project } = await db
    .from('projects')
    .select('id')
    .eq('id', projectId)
    .eq('organization_id', org.id)
    .is('deleted_at', null)
    .maybeSingle()

  if (!project) return Response.json({ error: 'Project not found' }, { status: 404 })

  // Fetch brand context
  const brand = await getBrandContext(org.id)
  if (!brand || !brand.mission || !brand.vision) {
    return Response.json(
      { error: 'Brand context must be configured before generating content' },
      { status: 422 },
    )
  }

  // Fetch content type + template
  const { data: contentType } = await db
    .from('content_types')
    .select('id, name, custom_rules, template_id, content_type_templates(base_prompt)')
    .eq('id', contentTypeId)
    .eq('organization_id', org.id)
    .eq('is_active', true)
    .is('deleted_at', null)
    .maybeSingle()

  if (!contentType) return Response.json({ error: 'Content type not found' }, { status: 404 })

  const basePrompt = (contentType.content_type_templates as { base_prompt: string } | null)?.base_prompt ?? ''

  // Resolve author
  let authorParam: Parameters<typeof buildPrompt>[0]['author']

  if (authorId === 'company') {
    authorParam = { type: 'company' }
  } else {
    const { data: authorProfile } = await db
      .from('author_profiles')
      .select('name, role, voice, tone, writing_style, personal_pillars, platform_notes')
      .eq('id', authorId)
      .eq('organization_id', org.id)
      .is('deleted_at', null)
      .maybeSingle()

    if (!authorProfile) return Response.json({ error: 'Author not found' }, { status: 404 })

    authorParam = { type: 'named', ...authorProfile }
  }

  const prompt = buildPrompt({
    brand,
    basePrompt,
    customRules: contentType.custom_rules,
    author: authorParam,
    brief,
  })

  // Route to the correct AI provider
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    return Response.json({ error: 'AI generation is not configured' }, { status: 503 })
  }

  let generatedContent: string

  if (model.provider === 'anthropic') {
    const anthropic = new Anthropic({ apiKey })
    try {
      const message = await anthropic.messages.create({
        model: model.id,
        max_tokens: 2048,
        messages: [{ role: 'user', content: prompt }],
      })
      const textBlock = message.content.find((b) => b.type === 'text')
      if (!textBlock || textBlock.type !== 'text') {
        return Response.json({ error: 'Generation failed. Please try again.' }, { status: 500 })
      }
      generatedContent = textBlock.text.trim()
    } catch {
      return Response.json({ error: 'Generation failed. Please try again.' }, { status: 500 })
    }
  } else {
    return Response.json({ error: `Provider "${model.provider}" is not yet configured.` }, { status: 503 })
  }

  // Save output
  const { output, error: saveError } = await createOutput({
    organizationId: org.id,
    projectId,
    contentTypeId,
    brief,
    content: generatedContent,
    userId: user.id,
    modelId: model.id,
  })

  if (saveError || !output) {
    return Response.json({ error: 'Content generated but failed to save. Please try again.' }, { status: 500 })
  }

  return Response.json({ output }, { status: 201 })
}
