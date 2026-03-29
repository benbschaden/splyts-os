import { z } from 'zod'
import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { getOrganizationForUser } from '@/lib/queries/organizations'
import { getBusinessPlan } from '@/lib/queries/business-plan'
import { getProjectMaterials } from '@/lib/queries/project-materials'
import { createOutput } from '@/lib/queries/outputs'
import { DEFAULT_MODEL } from '@/lib/ai/models'
import { buildProjectOutputPrompt } from '@/lib/ai/prompts'

const schema = z.object({
  description: z.string().min(1, 'Brief is required').max(2000),
  outputType: z.string().min(1).max(100),
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

    const { description, outputType } = parsed.data
    const db = createServiceClient()

    // Verify project belongs to this org
    const { data: project } = await db
      .from('projects')
      .select('id, name, description')
      .eq('id', projectId)
      .eq('organization_id', org.id)
      .is('deleted_at', null)
      .maybeSingle()

    if (!project) return Response.json({ error: 'Project not found' }, { status: 404 })

    // Fetch context in parallel
    const [materialsRaw, businessPlan] = await Promise.all([
      getProjectMaterials(projectId, org.id),
      getBusinessPlan(org.id),
    ])

    const materials = materialsRaw.map((m) => ({
      material_type: m.material_type,
      title: m.title,
      content: m.content,
      file_name: m.file_name,
      link_url: m.link_url,
    }))

    const systemPrompt = buildProjectOutputPrompt({
      projectName: project.name,
      projectDescription: project.description ?? null,
      outputType,
      brief: description,
      materials,
      businessPlanSections: businessPlan?.sections ?? null,
    })

    const apiKey = process.env.ANTHROPIC_API_KEY
    if (!apiKey) return Response.json({ error: 'AI generation is not configured' }, { status: 503 })

    const anthropic = new Anthropic({ apiKey })

    let content: string
    try {
      const response = await anthropic.messages.create({
        model: DEFAULT_MODEL.id,
        max_tokens: 4096,
        messages: [{ role: 'user', content: `Create a ${outputType}.\n\nBrief: ${description}` }],
        system: systemPrompt,
      })
      const textBlock = response.content.find((b) => b.type === 'text')
      if (!textBlock || textBlock.type !== 'text') {
        return Response.json({ error: 'Generation failed. Please try again.' }, { status: 500 })
      }
      content = textBlock.text.trim()
    } catch {
      return Response.json({ error: 'Generation failed. Please try again.' }, { status: 500 })
    }

    // Save as output with no content_type (project deliverable)
    const brief = `${outputType}: ${description}`
    const { output, error: saveError } = await createOutput({
      organizationId: org.id,
      projectId,
      contentTypeId: null,
      brief,
      content,
      userId: user.id,
      modelId: DEFAULT_MODEL.id,
    })

    if (saveError || !output) {
      return Response.json({ error: 'Failed to save output. Please try again.' }, { status: 500 })
    }

    return Response.json({ output }, { status: 201 })
  } catch {
    return Response.json({ error: 'Internal error' }, { status: 500 })
  }
}
