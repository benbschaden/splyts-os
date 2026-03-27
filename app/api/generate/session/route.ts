import { z } from 'zod'
import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@/lib/supabase/server'
import { getOrganizationForUser } from '@/lib/queries/organizations'
import { getBrandContext } from '@/lib/queries/brand-context'
import { getBusinessPlan } from '@/lib/queries/business-plan'
import { getPersonas } from '@/lib/queries/personas'
import { getProductContext } from '@/lib/queries/product-context'
import { getAiVisibleProductFeatures } from '@/lib/queries/product-features'
import { getCurrentGoals } from '@/lib/queries/current-goals'
import { getTopPerformingOutputs } from '@/lib/queries/outputs'
import { createServiceClient } from '@/lib/supabase/service'
import { getModelById, DEFAULT_MODEL } from '@/lib/ai/models'
import { buildGenerationSystemPrompt, type GenerationAuthor } from '@/lib/ai/prompts'

const schema = z.object({
  projectId: z.string().uuid(),
  contentTypeId: z.string().uuid(),
  authorId: z.string(),
  modelId: z.string().optional(),
  // Full conversation history sent with every request (stateless)
  messages: z.array(
    z.object({
      role: z.enum(['user', 'assistant']),
      content: z.string(),
    }),
  ),
})

export async function POST(request: Request): Promise<Response> {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

    const org = await getOrganizationForUser(user.id)
    if (!org) return Response.json({ error: 'Not found' }, { status: 404 })

    const body = await request.json()
    const parsed = schema.safeParse(body)
    if (!parsed.success) {
      return Response.json({ error: parsed.error.errors[0].message }, { status: 400 })
    }

    const { projectId, contentTypeId, authorId, modelId, messages } = parsed.data

    const model = (modelId ? getModelById(modelId) : null) ?? DEFAULT_MODEL
    if (model.provider !== 'anthropic') {
      return Response.json({ error: `Provider "${model.provider}" is not yet configured.` }, { status: 503 })
    }

    const db = createServiceClient()

    // Verify project belongs to this org
    const { data: project } = await db
      .from('projects')
      .select('id')
      .eq('id', projectId)
      .eq('organization_id', org.id)
      .is('deleted_at', null)
      .maybeSingle()

    if (!project) return Response.json({ error: 'Project not found' }, { status: 404 })

    // Fetch context in parallel
    const [brand, businessPlan, personas, productContext, productFeatures, currentGoals, topPerformers, contentTypeResult] = await Promise.all([
      getBrandContext(org.id),
      getBusinessPlan(org.id),
      getPersonas(org.id),
      getProductContext(org.id),
      getAiVisibleProductFeatures(org.id),
      getCurrentGoals(org.id),
      getTopPerformingOutputs(org.id, 3),
      db
        .from('content_types')
        .select('id, name, custom_rules, cadence, template_id, content_type_templates(base_prompt)')
        .eq('id', contentTypeId)
        .eq('organization_id', org.id)
        .eq('is_active', true)
        .is('deleted_at', null)
        .maybeSingle(),
    ])

    if (!brand || !brand.mission || !brand.vision) {
      return Response.json({ error: 'Brand context must be configured before generating content' }, { status: 422 })
    }

    const contentType = contentTypeResult.data
    if (!contentType) return Response.json({ error: 'Content type not found' }, { status: 404 })

    const basePrompt = (contentType.content_type_templates as { base_prompt: string } | null)?.base_prompt ?? ''
    const cadence = (contentType as unknown as { cadence?: string | null }).cadence ?? null

    // Resolve author
    let author: GenerationAuthor

    if (authorId === 'company') {
      author = { type: 'company' }
    } else {
      const { data: authorProfile } = await db
        .from('author_profiles')
        .select('name, role, voice, tone, writing_style, personal_pillars, platform_notes')
        .eq('id', authorId)
        .eq('organization_id', org.id)
        .is('deleted_at', null)
        .maybeSingle()

      if (!authorProfile) return Response.json({ error: 'Author not found' }, { status: 404 })
      author = { type: 'named', ...authorProfile }
    }

    const systemPrompt = buildGenerationSystemPrompt({
      brand,
      businessPlanSections: businessPlan?.sections ?? null,
      personas,
      productSections: productContext?.sections ?? null,
      productFeatures,
      currentGoals,
      topPerformers,
      contentTypeName: contentType.name,
      basePrompt,
      customRules: contentType.custom_rules,
      cadence,
      author,
    })

    const apiKey = process.env.ANTHROPIC_API_KEY
    if (!apiKey) return Response.json({ error: 'AI generation is not configured' }, { status: 503 })

    const anthropic = new Anthropic({ apiKey })

    if (messages.length === 0) {
      return Response.json({ error: 'Messages cannot be empty' }, { status: 400 })
    }

    const conversationHistory: Array<{ role: 'user' | 'assistant'; content: string }> = messages

    let assistantContent: string

    try {
      const response = await anthropic.messages.create({
        model: model.id,
        max_tokens: 2048,
        system: systemPrompt,
        messages: conversationHistory,
      })
      const textBlock = response.content.find((b) => b.type === 'text')
      if (!textBlock || textBlock.type !== 'text') {
        return Response.json({ error: 'Generation failed. Please try again.' }, { status: 500 })
      }
      assistantContent = textBlock.text.trim()
    } catch {
      return Response.json({ error: 'Generation failed. Please try again.' }, { status: 500 })
    }

    return Response.json({ assistantMessage: assistantContent })
  } catch {
    return Response.json({ error: 'Internal error' }, { status: 500 })
  }
}
