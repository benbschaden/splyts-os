import { z } from 'zod'
import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { getOrganizationForUser } from '@/lib/queries/organizations'
import { getBusinessPlan } from '@/lib/queries/business-plan'
import { getProjectMaterials } from '@/lib/queries/project-materials'
import { getOutputsForProject, createDraftOutput, updateDraftOutput } from '@/lib/queries/outputs'
import { DEFAULT_MODEL, getModelById } from '@/lib/ai/models'
import { buildProjectOutputSessionSystemPrompt } from '@/lib/ai/prompts'

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

    const [materialsRaw, businessPlan, previousOutputs] = await Promise.all([
      getProjectMaterials(projectId, org.id),
      getBusinessPlan(org.id),
      // Published outputs only for AI context — drafts are not ready to reference
      getOutputsForProject(projectId, org.id),
    ])

    const materials = materialsRaw.map((m) => ({
      material_type: m.material_type,
      title: m.title,
      content: m.content,
      file_name: m.file_name,
      link_url: m.link_url,
    }))

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
