// Project-scoped generate session — used by ProjectOutputDialog (project page Generate button).
// URL: POST /api/projects/[id]/generate/session
// For the marketing content generator (Generate tab), see /api/generate/session/route.ts
import { z } from 'zod'
import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { getOrganizationForUser } from '@/lib/queries/organizations'
import { getBusinessPlan } from '@/lib/queries/business-plan'
import { getBrandContext } from '@/lib/queries/brand-context'
import { getPersonas } from '@/lib/queries/personas'
import { getProductContext } from '@/lib/queries/product-context'
import { getAiVisibleProductFeatures } from '@/lib/queries/product-features'
import { getActiveGoalPeriod } from '@/lib/queries/goal-periods'
import { getAiVisibleCompetitors } from '@/lib/queries/competitors'
import { getApprovedSocialProof } from '@/lib/queries/social-proof'
import { getProjectMaterials } from '@/lib/queries/project-materials'
import { getOutputsForProject, createDraftOutput, updateDraftOutput } from '@/lib/queries/outputs'
import { DEFAULT_MODEL, getModelById } from '@/lib/ai/models'
import { buildProjectOutputSessionSystemPrompt } from '@/lib/ai/prompts'
import { fetchFullTextsForMaterials } from '@/lib/retrieval/search'
import { getAllOrgDiscoveryEntries } from '@/lib/queries/discovery-entries'
import { getContactsForOrg } from '@/lib/queries/contacts'
import { getRecentCommunicationsForOrg } from '@/lib/queries/contact-communications'
import { getCustomerInsightsForOrg } from '@/lib/queries/customer-insights'

const schema = z.object({
  outputType: z.string().min(1).max(100),
  modelId: z.string().optional(),
  draftId: z.string().uuid().optional(),
  messages: z.array(
    z.object({
      role: z.enum(['user', 'assistant']),
      content: z.string(),
    }),
  ),
})

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: projectId } = await params

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

    const { outputType, modelId, draftId, messages } = parsed.data
    const model = (modelId ? getModelById(modelId) : null) ?? DEFAULT_MODEL
    if (model.provider !== 'anthropic') {
      return Response.json({ error: `Provider "${model.provider}" is not yet configured.` }, { status: 503 })
    }

    const db = createServiceClient()

    const { data: project } = await db
      .from('projects')
      .select('id, name, description')
      .eq('id', projectId)
      .eq('organization_id', org.id)
      .is('deleted_at', null)
      .maybeSingle()

    if (!project) return Response.json({ error: 'Project not found' }, { status: 404 })

    const [materialsRaw, businessPlan, previousOutputs, brand, personas, productContext, productFeatures, currentGoals, competitors, socialProof, discoveryEntries, hubContacts, hubComms, hubInsights] = await Promise.all([
      getProjectMaterials(projectId, org.id),
      getBusinessPlan(org.id),
      getOutputsForProject(projectId, org.id),
      getBrandContext(org.id),
      getPersonas(org.id),
      getProductContext(org.id),
      getAiVisibleProductFeatures(org.id),
      getActiveGoalPeriod(org.id),
      getAiVisibleCompetitors(org.id),
      getApprovedSocialProof(org.id),
      getAllOrgDiscoveryEntries(org.id),
      getContactsForOrg(org.id),
      getRecentCommunicationsForOrg(org.id, 60),
      getCustomerInsightsForOrg(org.id),
    ])

    const materials = materialsRaw.map((m) => ({
      material_type: m.material_type,
      title: m.title,
      content: m.content,
      file_name: m.file_name,
      link_url: m.link_url,
    }))

    const fileMaterials = materialsRaw
      .filter((m) => m.material_type === 'file')
      .map((m) => ({ id: m.id, title: m.title, file_name: m.file_name }))
    const fileFullTexts = fileMaterials.length > 0
      ? await fetchFullTextsForMaterials(fileMaterials, org.id)
      : []

    // Pass up to the 5 most recent outputs as context (newest first from query)
    const previousOutputsForPrompt = previousOutputs.slice(0, 5).map((o) => ({
      brief: o.brief,
      content: o.content,
      createdAt: o.created_at,
    }))

    const systemPrompt = buildProjectOutputSessionSystemPrompt({
      projectName: project.name,
      projectDescription: project.description ?? null,
      outputType,
      materials,
      businessPlanSections: businessPlan?.sections ?? null,
      previousOutputs: previousOutputsForPrompt,
      fileFullTexts: fileFullTexts.length > 0 ? fileFullTexts : undefined,
      brand: brand ?? null,
      personas,
      productSections: productContext?.sections ?? null,
      productFeatures,
      currentGoals: currentGoals ?? null,
      competitors,
      socialProof,
      discoveryEntries: discoveryEntries.length > 0 ? discoveryEntries : undefined,
      customerInsights: hubInsights.length > 0 ? hubInsights : undefined,
      allContacts: hubContacts.length > 0 ? hubContacts : undefined,
      allRecentComms: hubComms.length > 0 ? hubComms : undefined,
    })

    const apiKey = process.env.ANTHROPIC_API_KEY
    if (!apiKey) return Response.json({ error: 'AI generation is not configured' }, { status: 503 })

    if (messages.length === 0) {
      return Response.json({ error: 'Messages cannot be empty' }, { status: 400 })
    }

    const anthropic = new Anthropic({ apiKey })

    let assistantContent: string
    try {
      const response = await anthropic.messages.create({
        model: model.id,
        max_tokens: 4096,
        system: systemPrompt,
        messages,
      })
      const textBlock = response.content.find((b) => b.type === 'text')
      if (!textBlock || textBlock.type !== 'text') {
        return Response.json({ error: 'Generation failed. Please try again.' }, { status: 500 })
      }
      assistantContent = textBlock.text.trim()
    } catch {
      return Response.json({ error: 'Generation failed. Please try again.' }, { status: 500 })
    }

    // Auto-save draft after every AI response
    const updatedMessages = [
      ...messages,
      { role: 'assistant' as const, content: assistantContent },
    ]
    const brief = messages.find((m) => m.role === 'user')?.content ?? outputType
    const content = assistantContent.replace(/^Here's your (?:updated )?draft:\n?/i, '').trim()

    let resolvedDraftId = draftId ?? null
    if (draftId) {
      await updateDraftOutput({
        id: draftId,
        organizationId: org.id,
        userId: user.id,
        brief: `${outputType}: ${brief}`,
        content,
        messages: updatedMessages,
      })
    } else {
      const { draftId: newId } = await createDraftOutput({
        organizationId: org.id,
        projectId,
        contentTypeId: null,
        outputType,
        brief: `${outputType}: ${brief}`,
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
