import { z } from 'zod'
import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { getOrganizationForUser } from '@/lib/queries/organizations'
import { getBusinessPlan } from '@/lib/queries/business-plan'
import { getProjectMaterials } from '@/lib/queries/project-materials'
import { getOutputsForProject } from '@/lib/queries/outputs'
import { DEFAULT_MODEL, getModelById } from '@/lib/ai/models'
import { buildProjectOutputSessionSystemPrompt } from '@/lib/ai/prompts'

const schema = z.object({
  outputType: z.string().min(1).max(100),
  modelId: z.string().optional(),
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

    const { outputType, modelId, messages } = parsed.data
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

    return Response.json({ assistantMessage: assistantContent })
  } catch {
    return Response.json({ error: 'Internal error' }, { status: 500 })
  }
}
