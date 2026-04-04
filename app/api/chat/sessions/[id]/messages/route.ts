import { z } from 'zod'
import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@/lib/supabase/server'
import { getOrganizationForUser } from '@/lib/queries/organizations'
import { getChatSessionById, getChatMessages, addChatMessage, updateChatSession } from '@/lib/queries/chat'
import { getBrandContext } from '@/lib/queries/brand-context'
import { getBusinessPlan } from '@/lib/queries/business-plan'
import { getPersonas } from '@/lib/queries/personas'
import { getProductContext } from '@/lib/queries/product-context'
import { getAiVisibleProductFeatures } from '@/lib/queries/product-features'
import { getProductRoadmapItems } from '@/lib/queries/product-roadmap'
import { getCompanyMilestones } from '@/lib/queries/company-milestones'
import { getActiveGoalPeriod } from '@/lib/queries/goal-periods'
import { getSharedDocuments } from '@/lib/queries/documents'
import { getAiVisibleCompetitors } from '@/lib/queries/competitors'
import { getApprovedSocialProof } from '@/lib/queries/social-proof'
import { getAiVisibleNarratives } from '@/lib/queries/brand-narratives'
import { getTerminologyForAi } from '@/lib/queries/terminology'
import { getKpiDefinitions } from '@/lib/queries/kpi-definitions'
import { getLatestSnapshot } from '@/lib/queries/kpi-snapshots'
import { getProjectMaterials } from '@/lib/queries/project-materials'
import { getAiVisibleDiscoveryEntries, getParticipantDiscoveryEntries } from '@/lib/queries/discovery-entries'
import { getAiVisibleInsights, getInsightsForContact, getInsightsForSegment, type InsightSourceSegment } from '@/lib/queries/customer-insights'
import { getCommunicationsForContact, getCommunicationsForSegment } from '@/lib/queries/contact-communications'
import { buildChatSystemPrompt } from '@/lib/ai/prompts'
import { DEFAULT_MODEL, getModelById } from '@/lib/ai/models'
import { retrieveRelevantDocuments } from '@/lib/retrieval/search'

const schema = z.object({
  content: z.string().min(1, 'Message cannot be empty').max(10000),
})

async function runWithBrowser(
  anthropic: Anthropic,
  modelId: string,
  systemPrompt: string,
  messageHistory: Anthropic.MessageParam[],
): Promise<string> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let loopMessages: any[] = [...messageHistory]
  const MAX_ITERATIONS = 6

  for (let i = 0; i < MAX_ITERATIONS; i++) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const response: any = await (anthropic.beta.messages.create as any)({
      betas: ['web-search-2025-03-05'],
      model: modelId,
      max_tokens: 8000,
      system: systemPrompt,
      messages: loopMessages,
      tools: [{ type: 'web_search_20250305', name: 'web_search' }],
    })

    if (response.stop_reason === 'end_turn') {
      const textBlock = response.content.find((b: { type: string }) => b.type === 'text')
      return textBlock?.text?.trim() ?? ''
    }

    if (response.stop_reason === 'tool_use') {
      loopMessages = [...loopMessages, { role: 'assistant', content: response.content }]
      const toolResults = response.content
        .filter((b: { type: string }) => b.type === 'tool_use')
        .map((b: { id: string }) => ({
          type: 'tool_result' as const,
          tool_use_id: b.id,
          content: [],
        }))
      loopMessages = [...loopMessages, { role: 'user', content: toolResults }]
      continue
    }

    const textBlock = response.content.find((b: { type: string }) => b.type === 'text')
    return textBlock?.text?.trim() ?? ''
  }

  return ''
}

async function runWithoutBrowser(
  anthropic: Anthropic,
  modelId: string,
  systemPrompt: string,
  messageHistory: Anthropic.MessageParam[],
): Promise<string> {
  const response = await anthropic.messages.create({
    model: modelId,
    max_tokens: 8000,
    system: systemPrompt,
    messages: messageHistory,
  })
  const textBlock = response.content.find((b) => b.type === 'text')
  return textBlock?.type === 'text' ? textBlock.text.trim() : ''
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

    const org = await getOrganizationForUser(user.id)
    if (!org) return Response.json({ error: 'Not found' }, { status: 404 })

    const session = await getChatSessionById(id, user.id)
    if (!session || session.organization_id !== org.id) {
      return Response.json({ error: 'Not found' }, { status: 404 })
    }

    const body = await request.json()
    const parsed = schema.safeParse(body)
    if (!parsed.success) {
      return Response.json({ error: parsed.error.errors[0].message }, { status: 400 })
    }

    const { content } = parsed.data
    const config = session.context_config
    const {
      brand: includeBrand,
      business_plan: includeBusinessPlan,
      personas: includePersonas,
      browser: browserEnabled = false,
      product: includeProduct = false,
      product_roadmap: includeProductRoadmap = false,
      company_milestones: includeCompanyMilestones = false,
      current_goals: includeCurrentGoals = false,
      filed_documents: includeFiledDocs = false,
      competitors: includeCompetitors = false,
      social_proof: includeSocialProof = false,
      kpis: includeKpis = false,
      project_materials: includeProjectMaterials = false,
      discovery_entries: includeDiscoveryEntries = false,
      discovery_participant: discoveryParticipant = null,
      customer_insights: includeCustomerInsights = false,
      customer_hub_contact_id: customerHubContactId = null,
      customer_hub_segment: customerHubSegment = null,
    } = config
    const model = getModelById(session.model_id) ?? DEFAULT_MODEL

    // Fetch all enabled context in parallel
    const shouldLoadMaterials = includeProjectMaterials && !!session.project_id
    const shouldLoadDiscovery = includeDiscoveryEntries && !!session.project_id

    const [
      brand,
      businessPlan,
      personas,
      productContext,
      productFeatures,
      roadmapItems,
      milestones,
      currentGoals,
      sharedDocs,
      competitors,
      socialProof,
      narratives,
      terminology,
      kpiDefinitions,
      kpiSnapshot,
      projectMaterials,
      discoveryEntries,
      customerInsightsData,
      contactCommsData,
      contactInsightsData,
      existingMessages,
      retrievedContext,
    ] = await Promise.all([
      includeBrand ? getBrandContext(org.id) : Promise.resolve(null),
      includeBusinessPlan ? getBusinessPlan(org.id) : Promise.resolve(null),
      includePersonas ? getPersonas(org.id) : Promise.resolve([]),
      includeProduct ? getProductContext(org.id) : Promise.resolve(null),
      includeProduct ? getAiVisibleProductFeatures(org.id) : Promise.resolve([]),
      includeProductRoadmap ? getProductRoadmapItems(org.id) : Promise.resolve([]),
      includeCompanyMilestones ? getCompanyMilestones(org.id) : Promise.resolve([]),
      includeCurrentGoals ? getActiveGoalPeriod(org.id) : Promise.resolve(null),
      includeFiledDocs ? getSharedDocuments(org.id) : Promise.resolve([]),
      includeCompetitors ? getAiVisibleCompetitors(org.id) : Promise.resolve([]),
      includeSocialProof ? getApprovedSocialProof(org.id) : Promise.resolve([]),
      includeBrand ? getAiVisibleNarratives(org.id) : Promise.resolve([]),
      includeBrand ? getTerminologyForAi(org.id) : Promise.resolve([]),
      includeKpis ? getKpiDefinitions(org.id) : Promise.resolve([]),
      includeKpis ? getLatestSnapshot(org.id) : Promise.resolve(null),
      shouldLoadMaterials ? getProjectMaterials(session.project_id!, org.id) : Promise.resolve([]),
      shouldLoadDiscovery
        ? discoveryParticipant
          ? getParticipantDiscoveryEntries(session.project_id!, org.id, discoveryParticipant)
          : getAiVisibleDiscoveryEntries(session.project_id!, org.id)
        : Promise.resolve([]),
      includeCustomerInsights ? getAiVisibleInsights(org.id) : Promise.resolve([]),
      customerHubContactId ? getCommunicationsForContact(customerHubContactId, org.id)
        : customerHubSegment ? getCommunicationsForSegment(customerHubSegment, org.id)
        : Promise.resolve([]),
      customerHubContactId ? getInsightsForContact(customerHubContactId, org.id)
        : customerHubSegment ? getInsightsForSegment(customerHubSegment as InsightSourceSegment, org.id)
        : Promise.resolve([]),
      getChatMessages(id),
      retrieveRelevantDocuments({
        query: content,
        organizationId: org.id,
        userId: user.id,
        projectId: session.project_id ?? undefined,
        limit: 5,
      }),
    ])

    // Build filed docs fallback (used only when retrieval returns nothing — e.g. embeddings not yet generated)
    const filedDocs = (retrievedContext.length === 0 && includeFiledDocs)
      ? sharedDocs
          .filter((d) => d.visibility === 'filed')
          .slice(0, 3)
          .map((d) => ({ title: d.title, body: d.content }))
      : []

    // Build roadmap/milestones as additional product context if toggled
    const productSections = productContext?.sections ?? null

    // Augment product sections with roadmap/milestones text if those toggles are on
    const augmentedSections = productSections ? { ...productSections } : null
    if (augmentedSections && includeProductRoadmap && roadmapItems.length > 0) {
      const roadmapText = ['now', 'next', 'later', 'shipped']
        .map((phase) => {
          const items = roadmapItems.filter((r) => r.phase === phase)
          if (!items.length) return null
          return `${phase.toUpperCase()}: ${items.map((r) => r.title).join(', ')}`
        })
        .filter(Boolean)
        .join('\n')
      augmentedSections['_roadmap'] = roadmapText
    }
    if (augmentedSections && includeCompanyMilestones && milestones.length > 0) {
      const milestonesText = milestones
        .map((m) => {
          let line = `${m.milestone_date}: ${m.title} (${m.status})`
          if (m.completion_notes) line += ` — ${m.completion_notes}`
          return line
        })
        .join('\n')
      augmentedSections['_milestones'] = milestonesText
    }

    const systemPrompt = buildChatSystemPrompt({
      brand,
      businessPlanSections: businessPlan?.sections ?? null,
      personas,
      productSections: augmentedSections,
      productFeatures,
      currentGoals,
      filedDocs,
      competitors,
      socialProof,
      narratives,
      terminology,
      kpiDefinitions,
      kpiSnapshot,
      includeBrand,
      includeBusinessPlan,
      includePersonas,
      includeProduct,
      includeCurrentGoals,
      includeFiledDocs,
      includeCompetitors,
      includeSocialProof,
      includeKpis,
      projectMaterials: shouldLoadMaterials ? projectMaterials : undefined,
      includeProjectMaterials: shouldLoadMaterials,
      discoveryEntries: shouldLoadDiscovery ? discoveryEntries : undefined,
      includeDiscoveryEntries: shouldLoadDiscovery,
      discoveryParticipant: discoveryParticipant ?? undefined,
      customerInsights: includeCustomerInsights ? customerInsightsData : undefined,
      includeCustomerInsights,
      customerHubContactComms: customerHubContactId ? contactCommsData : undefined,
      includeCustomerHubContact: !!customerHubContactId,
      contactInsights: customerHubContactId && contactInsightsData.length > 0 ? contactInsightsData : undefined,
      segmentComms: customerHubSegment ? contactCommsData : undefined,
      segmentInsights: customerHubSegment ? contactInsightsData : undefined,
      hubSegment: customerHubSegment ?? undefined,
      retrievedContext: retrievedContext.length > 0 ? retrievedContext : undefined,
    })

    const messageHistory: Anthropic.MessageParam[] = [
      ...existingMessages.map((m) => ({ role: m.role as 'user' | 'assistant', content: m.content })),
      { role: 'user', content },
    ]

    const apiKey = process.env.ANTHROPIC_API_KEY
    if (!apiKey) {
      return Response.json({ error: 'AI is not configured' }, { status: 503 })
    }

    const anthropic = new Anthropic({ apiKey })
    let assistantContent: string

    try {
      assistantContent = browserEnabled
        ? await runWithBrowser(anthropic, model.id, systemPrompt, messageHistory)
        : await runWithoutBrowser(anthropic, model.id, systemPrompt, messageHistory)

      if (!assistantContent) {
        return Response.json({ error: 'AI response failed. Please try again.' }, { status: 500 })
      }
    } catch (err) {
      console.error('[chat/messages] AI call failed:', err)
      return Response.json({ error: 'AI response failed. Please try again.' }, { status: 500 })
    }

    // Save both messages
    const [userMsg, assistantMsg] = await Promise.all([
      addChatMessage(id, 'user', content),
      addChatMessage(id, 'assistant', assistantContent),
    ])

    if (userMsg.error || assistantMsg.error) {
      console.error('[chat/messages] Failed to save messages')
      return Response.json({ error: 'Failed to save messages' }, { status: 500 })
    }

    // Auto-title the session from the first user message
    if (existingMessages.length === 0) {
      const title = content.length > 60 ? content.slice(0, 57) + '…' : content
      await updateChatSession(id, user.id, { title })
    }

    return Response.json({
      userMessage: userMsg.message,
      assistantMessage: assistantMsg.message,
    }, { status: 201 })
  } catch {
    return Response.json({ error: 'Internal error' }, { status: 500 })
  }
}
