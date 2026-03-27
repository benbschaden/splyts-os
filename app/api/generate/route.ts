import { z } from 'zod'
import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@/lib/supabase/server'
import { getOrganizationForUser } from '@/lib/queries/organizations'
import { getBrandContext } from '@/lib/queries/brand-context'
import { getBusinessPlan } from '@/lib/queries/business-plan'
import { BUSINESS_PLAN_SECTIONS, type BusinessPlanSections, getAiVisibleKeys } from '@/lib/company/business-plan-sections'
import { getPersonas, type PersonaRow } from '@/lib/queries/personas'
import { getProductContext } from '@/lib/queries/product-context'
import { getAiVisibleProductFeatures } from '@/lib/queries/product-features'
import { getCurrentGoals } from '@/lib/queries/current-goals'
import { getPlatformGuidelineByName } from '@/lib/queries/platform-guidelines'
import { getTopPerformingOutputs } from '@/lib/queries/outputs'
import { PRODUCT_SECTIONS } from '@/lib/company/product-sections'
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

function buildBusinessPlanContext(sections: BusinessPlanSections): string {
  const visible = getAiVisibleKeys(sections)
  const filled = BUSINESS_PLAN_SECTIONS
    .filter((s) => visible.has(s.key) && (sections[s.key] ?? '').trim())
    .map((s) => `${s.label}: ${sections[s.key].trim()}`)
  if (filled.length === 0) return ''
  return filled.join('\n')
}

function buildPersonasContext(personas: PersonaRow[]): string {
  const visible = personas.filter((p) => p.include_in_ai)
  if (visible.length === 0) return ''

  return visible.map((p) => {
    const parts: string[] = [`Persona: ${p.name}`]
    if (p.tagline) parts.push(`Summary: ${p.tagline}`)
    if (p.age_range || p.job_title || p.industry || p.company_size || p.location) {
      const demo: string[] = []
      if (p.age_range) demo.push(p.age_range)
      if (p.job_title) demo.push(p.job_title)
      if (p.industry) demo.push(p.industry)
      if (p.company_size) demo.push(p.company_size)
      if (p.location) demo.push(p.location)
      parts.push(`Demographics: ${demo.join(', ')}`)
    }
    if (p.goals) parts.push(`Goals: ${p.goals}`)
    if (p.frustrations) parts.push(`Frustrations: ${p.frustrations}`)
    if (p.motivations) parts.push(`Motivations: ${p.motivations}`)
    if (p.behaviors) parts.push(`Behaviours: ${p.behaviors}`)
    if (p.values) parts.push(`Values: ${p.values}`)
    if (p.channels) parts.push(`Channels: ${p.channels}`)
    if (p.buying_triggers) parts.push(`Buying triggers: ${p.buying_triggers}`)
    if (p.objections) parts.push(`Objections: ${p.objections}`)
    if (p.quote) parts.push(`In their words: "${p.quote}"`)
    return parts.join('\n')
  }).join('\n\n')
}

type AuthorParam = { type: 'company' } | {
  type: 'named'
  name: string
  role: string | null
  voice: string | null
  tone: string | null
  writing_style: string | null
  personal_pillars: string | null
  platform_notes: string | null
}

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
    guardrails?: string | null
  }
  businessPlanContext: string
  personasContext: string
  productContextText: string
  productFeaturesText: string
  currentGoalsText: string
  platformGuidelineText: string
  topPerformersText: string
  basePrompt: string
  customRules: string
  author: AuthorParam
  brief: string
}): string {
  const {
    brand, businessPlanContext, personasContext,
    productContextText, productFeaturesText, currentGoalsText,
    platformGuidelineText, topPerformersText,
    basePrompt, customRules, author, brief,
  } = params

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

  if (brand.guardrails) {
    lines.push('')
    lines.push('[GUARDRAILS — never violate these]')
    lines.push(brand.guardrails)
  }

  if (businessPlanContext) {
    lines.push('')
    lines.push('[BUSINESS CONTEXT]')
    lines.push('The following is the company business plan. Use it as background knowledge to ensure content is strategically aligned.')
    lines.push(businessPlanContext)
  }

  if (personasContext) {
    lines.push('')
    lines.push('[TARGET PERSONAS]')
    lines.push('The following are the target audience personas. Write content that speaks to their goals, frustrations, and language. If multiple personas are listed, write for all of them or the most relevant one given the brief.')
    lines.push(personasContext)
  }

  if (currentGoalsText) {
    lines.push('')
    lines.push('[CURRENT GOALS]')
    lines.push('Use these to ensure content is strategically timed and on-message.')
    lines.push(currentGoalsText)
  }

  if (productContextText) {
    lines.push('')
    lines.push('[PRODUCT CONTEXT]')
    lines.push(productContextText)
  }

  if (productFeaturesText) {
    lines.push('')
    lines.push('[PRODUCT FEATURES]')
    lines.push(productFeaturesText)
  }

  if (platformGuidelineText) {
    lines.push('')
    lines.push('[PLATFORM GUIDELINES]')
    lines.push(platformGuidelineText)
  }

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

  if (topPerformersText) {
    lines.push('')
    lines.push('[TOP PERFORMING CONTENT — use as style reference]')
    lines.push(topPerformersText)
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

  // Fetch brand context, business plan, personas, and new context in parallel
  const [brand, businessPlan, personas, productContext, productFeatures, currentGoals, topPerformers] = await Promise.all([
    getBrandContext(org.id),
    getBusinessPlan(org.id),
    getPersonas(org.id),
    getProductContext(org.id),
    getAiVisibleProductFeatures(org.id),
    getCurrentGoals(org.id),
    getTopPerformingOutputs(org.id, 3),
  ])
  if (!brand || !brand.mission || !brand.vision) {
    return Response.json(
      { error: 'Brand context must be configured before generating content' },
      { status: 422 },
    )
  }

  const businessPlanContext = buildBusinessPlanContext(businessPlan?.sections ?? {})
  const personasContext = buildPersonasContext(personas)

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
  const contentTypePlatform = (contentType as unknown as { platform?: string | null }).platform ?? null

  // Fetch matched platform guideline if content type has a platform
  const matchedPlatformGuideline = contentTypePlatform
    ? await getPlatformGuidelineByName(org.id, contentTypePlatform)
    : null

  // Resolve author
  let authorParam: AuthorParam

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

  // Build product context text
  const productContextText = productContext?.sections
    ? PRODUCT_SECTIONS
        .filter((s) => s.aiVisibleByDefault && (productContext.sections[s.key] ?? '').trim())
        .map((s) => `${s.label}: ${productContext.sections[s.key].trim()}`)
        .join('\n')
    : ''

  // Build product features text (name: tagline format, AI-visible only)
  const productFeaturesText = productFeatures.length > 0
    ? productFeatures
        .filter((f) => f.include_in_ai)
        .map((f) => f.tagline ? `- ${f.name}: ${f.tagline}` : `- ${f.name}`)
        .join('\n')
    : ''

  // Build current goals text
  const currentGoalsText = currentGoals?.sections
    ? Object.entries({
        'Period': currentGoals.sections.period_label,
        'Focus areas': currentGoals.sections.focus_areas,
        'Key results': currentGoals.sections.key_results,
        'What to push': currentGoals.sections.what_to_push,
        'What to defer': currentGoals.sections.what_to_defer,
      })
        .filter(([, v]) => v?.trim())
        .map(([k, v]) => `${k}: ${v.trim()}`)
        .join('\n')
    : ''

  // Build platform guideline text
  const platformGuidelineText = matchedPlatformGuideline
    ? [
        `Platform: ${matchedPlatformGuideline.platform_name}`,
        matchedPlatformGuideline.guidelines,
        matchedPlatformGuideline.format_notes ? `Format notes: ${matchedPlatformGuideline.format_notes}` : null,
        matchedPlatformGuideline.cadence ? `Cadence: ${matchedPlatformGuideline.cadence}` : null,
      ].filter(Boolean).join('\n')
    : ''

  // Build top performers text
  const topPerformersText = topPerformers.length > 0
    ? topPerformers.map((o, i) =>
        `Example ${i + 1} (${o.reach.toLocaleString()} ${o.reach_metric}):\nBrief: ${o.brief.slice(0, 120)}\nContent: ${o.content.slice(0, 300)}${o.content.length > 300 ? '…' : ''}`
      ).join('\n\n')
    : ''

  const prompt = buildPrompt({
    brand,
    businessPlanContext,
    personasContext,
    productContextText,
    productFeaturesText,
    currentGoalsText,
    platformGuidelineText,
    topPerformersText,
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
