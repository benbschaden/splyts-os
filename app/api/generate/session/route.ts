// Marketing content generator session — used by GenerationSessionDialog (Generate tab).
// URL: POST /api/generate/session
// For the project-page Generate button, see /api/projects/[id]/generate/session/route.ts
import { z } from 'zod'
import Anthropic from '@anthropic-ai/sdk'
import OpenAI from 'openai'
import { createClient } from '@/lib/supabase/server'
import { getOrganizationForUser } from '@/lib/queries/organizations'
import { getBrandContext } from '@/lib/queries/brand-context'
import { getBusinessPlan } from '@/lib/queries/business-plan'
import { getPersonas } from '@/lib/queries/personas'
import { getProductContext } from '@/lib/queries/product-context'
import { getAiVisibleProductFeatures } from '@/lib/queries/product-features'
import { getActiveGoalPeriod } from '@/lib/queries/goal-periods'
import { getAiVisibleCompetitors } from '@/lib/queries/competitors'
import { getApprovedSocialProof } from '@/lib/queries/social-proof'
import { getAiVisibleNarratives } from '@/lib/queries/brand-narratives'
import { getTerminologyForAi } from '@/lib/queries/terminology'
import { getKpiDefinitions } from '@/lib/queries/kpi-definitions'
import { getLatestSnapshot } from '@/lib/queries/kpi-snapshots'
import { getTopPerformingOutputs, createDraftOutput, updateDraftOutput } from '@/lib/queries/outputs'
import { getProjectMaterials } from '@/lib/queries/project-materials'
import { createServiceClient } from '@/lib/supabase/service'
import { getModelById, DEFAULT_MODEL } from '@/lib/ai/models'
import { buildGenerationSystemPrompt, type GenerationAuthor } from '@/lib/ai/prompts'
import { retrieveRelevantDocuments, fetchFullTextsForMaterials } from '@/lib/retrieval/search'

const schema = z.object({
  projectId: z.string().uuid(),
  contentTypeId: z.string().uuid(),
  authorId: z.string(),
  modelId: z.string().optional(),
  draftId: z.string().uuid().optional(),
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

    const { projectId, contentTypeId, authorId, modelId, draftId, messages } = parsed.data

    const model = (modelId ? getModelById(modelId) : null) ?? DEFAULT_MODEL

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

    // Use first user message as retrieval query if available, otherwise use projectId description
    const firstUserMessage = messages.find((m) => m.role === 'user')?.content ?? ''

    // Fetch context in parallel
    const [brand, businessPlan, personas, productContext, productFeatures, currentGoals, competitors, socialProof, narratives, terminology, kpiDefinitions, kpiSnapshot, topPerformers, projectMaterialsRaw, contentTypeResult, retrievedContext] = await Promise.all([
      getBrandContext(org.id),
      getBusinessPlan(org.id),
      getPersonas(org.id),
      getProductContext(org.id),
      getAiVisibleProductFeatures(org.id),
      getActiveGoalPeriod(org.id),
      getAiVisibleCompetitors(org.id),
      getApprovedSocialProof(org.id),
      getAiVisibleNarratives(org.id),
      getTerminologyForAi(org.id),
      getKpiDefinitions(org.id),
      getLatestSnapshot(org.id),
      getTopPerformingOutputs(org.id, 3),
      getProjectMaterials(projectId, org.id),
      db
        .from('content_types')
        .select('id, name, custom_rules, cadence, template_id, content_type_templates(base_prompt)')
        .eq('id', contentTypeId)
        .eq('organization_id', org.id)
        .eq('is_active', true)
        .is('deleted_at', null)
        .maybeSingle(),
      firstUserMessage
        ? retrieveRelevantDocuments({
            query: firstUserMessage,
            organizationId: org.id,
            userId: user.id,
            projectId,
            limit: 10,
          })
        : Promise.resolve([]),
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
      // Verify the user is a member of this org, then fetch their voice profile
      const { data: membership } = await db
        .from('organization_members')
        .select('user_id')
        .eq('user_id', authorId)
        .eq('organization_id', org.id)
        .maybeSingle()

      if (!membership) return Response.json({ error: 'Not found' }, { status: 404 })

      const { data: authorProfile } = await db
        .from('user_profiles')
        .select('full_name, role, voice, tone, writing_style, personal_pillars, platform_notes')
        .eq('id', authorId)
        .maybeSingle()

      if (!authorProfile) return Response.json({ error: 'Not found' }, { status: 404 })

      author = {
        type: 'named',
        name: authorProfile.full_name ?? 'Unknown',
        role: authorProfile.role,
        voice: authorProfile.voice,
        tone: authorProfile.tone,
        writing_style: authorProfile.writing_style,
        personal_pillars: authorProfile.personal_pillars,
        platform_notes: authorProfile.platform_notes,
      }
    }

    const projectMaterials = projectMaterialsRaw.map((m) => ({
      material_type: m.material_type,
      title: m.title,
      content: m.content,
      file_name: m.file_name,
      link_url: m.link_url,
    }))

    const fileMaterials = projectMaterialsRaw
      .filter((m) => m.material_type === 'file')
      .map((m) => ({ id: m.id, title: m.title, file_name: m.file_name }))
    const fileFullTexts = fileMaterials.length > 0
      ? await fetchFullTextsForMaterials(fileMaterials, org.id)
      : []

    const systemPrompt = buildGenerationSystemPrompt({
      brand,
      businessPlanSections: businessPlan?.sections ?? null,
      personas,
      productSections: productContext?.sections ?? null,
      productFeatures,
      currentGoals,
      competitors,
      socialProof,
      narratives,
      terminology,
      kpiDefinitions,
      kpiSnapshot,
      topPerformers,
      contentTypeName: contentType.name,
      basePrompt,
      customRules: contentType.custom_rules,
      cadence,
      author,
      projectMaterials,
      retrievedContext: retrievedContext.length > 0 ? retrievedContext : undefined,
      fileFullTexts: fileFullTexts.length > 0 ? fileFullTexts : undefined,
    })

    if (messages.length === 0) {
      return Response.json({ error: 'Messages cannot be empty' }, { status: 400 })
    }

    const conversationHistory: Array<{ role: 'user' | 'assistant'; content: string }> = messages

    let assistantContent: string

    if (model.provider === 'anthropic') {
      const apiKey = process.env.ANTHROPIC_API_KEY
      if (!apiKey) return Response.json({ error: 'AI generation is not configured' }, { status: 503 })
      const anthropic = new Anthropic({ apiKey })
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
    } else if (model.provider === 'openai') {
      const apiKey = process.env.OPENAI_API_KEY
      if (!apiKey) return Response.json({ error: 'OpenAI is not configured' }, { status: 503 })
      const openai = new OpenAI({ apiKey })
      try {
        if (model.openaiApi === 'responses') {
          const response = await openai.responses.create({
            model: model.id,
            instructions: systemPrompt,
            input: conversationHistory,
          })
          assistantContent = response.output_text?.trim() ?? ''
        } else {
          const response = await openai.chat.completions.create({
            model: model.id,
            max_tokens: 2048,
            messages: [
              { role: 'system', content: systemPrompt },
              ...conversationHistory,
            ],
          })
          assistantContent = response.choices[0]?.message?.content?.trim() ?? ''
        }
        if (!assistantContent) {
          return Response.json({ error: 'Generation failed. Please try again.' }, { status: 500 })
        }
      } catch {
        return Response.json({ error: 'Generation failed. Please try again.' }, { status: 500 })
      }
    } else {
      return Response.json({ error: `Provider "${model.provider}" is not configured.` }, { status: 503 })
    }

    // Auto-save draft after every AI response
    const updatedMessages = [
      ...messages,
      { role: 'assistant' as const, content: assistantContent },
    ]
    const brief = messages.find((m) => m.role === 'user')?.content ?? ''
    const content = assistantContent.replace(/^Here's your (?:updated )?draft:\n?/i, '').trim()

    let resolvedDraftId = draftId ?? null
    if (draftId) {
      await updateDraftOutput({
        id: draftId,
        organizationId: org.id,
        userId: user.id,
        brief,
        content,
        messages: updatedMessages,
      })
    } else {
      const { draftId: newId } = await createDraftOutput({
        organizationId: org.id,
        projectId,
        contentTypeId,
        outputType: contentType.name,
        brief,
        content,
        messages: updatedMessages,
        userId: user.id,
        modelId: model.id,
      })
      resolvedDraftId = newId
    }

    return Response.json({ assistantMessage: assistantContent, draftId: resolvedDraftId })
  } catch {
    return Response.json({ error: 'Internal error' }, { status: 500 })
  }
}
