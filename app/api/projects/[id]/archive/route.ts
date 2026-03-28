import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@/lib/supabase/server'
import { getOrganizationForUser } from '@/lib/queries/organizations'
import { getProjectById, updateProject } from '@/lib/queries/projects'
import { getProjectMaterials } from '@/lib/queries/project-materials'
import { getOutputsForProject } from '@/lib/queries/outputs'
import { getBrandContext } from '@/lib/queries/brand-context'
import { createDocument } from '@/lib/queries/documents'
import { buildProjectArchivePrompt } from '@/lib/ai/prompts'
import { DEFAULT_MODEL } from '@/lib/ai/models'

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: projectId } = await params
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const org = await getOrganizationForUser(user.id)
    if (!org || org.role !== 'admin') {
      return Response.json({ error: 'Forbidden' }, { status: 403 })
    }

    const project = await getProjectById(projectId, org.id)
    if (!project) {
      return Response.json({ error: 'Not found' }, { status: 404 })
    }

    const projectStatus = project.status ?? 'active'
    if (projectStatus !== 'active') {
      return Response.json({ error: 'Project is already archived' }, { status: 422 })
    }

    const [materials, outputs, brand] = await Promise.all([
      getProjectMaterials(projectId, org.id),
      getOutputsForProject(projectId, org.id),
      getBrandContext(org.id),
    ])

    const materialsForPrompt = materials.map((m) => ({
      material_type: m.material_type,
      title: m.title,
      content: m.content,
      file_name: m.file_name,
      link_url: m.link_url,
    }))

    const outputSummaries = outputs.map((o) => ({
      brief: o.brief,
      content: o.content,
    }))

    const prompt = buildProjectArchivePrompt({
      projectName: project.name,
      materials: materialsForPrompt,
      outputSummaries,
      brand,
    })

    const apiKey = process.env.ANTHROPIC_API_KEY
    if (!apiKey) {
      return Response.json({ error: 'AI is not configured' }, { status: 503 })
    }

    const anthropic = new Anthropic({ apiKey })
    let archiveContent: string

    try {
      const response = await anthropic.messages.create({
        model: DEFAULT_MODEL.id,
        max_tokens: 4096,
        messages: [{ role: 'user', content: prompt }],
      })
      const textBlock = response.content.find((b) => b.type === 'text')
      if (!textBlock || textBlock.type !== 'text') {
        return Response.json(
          { error: 'Archive generation failed. Please try again.' },
          { status: 500 },
        )
      }
      archiveContent = textBlock.text.trim()
    } catch (err) {
      console.error('[projects/archive] Anthropic error:', err)
      return Response.json(
        { error: 'Archive generation failed. Please try again.' },
        { status: 500 },
      )
    }

    const title = `Project Archive: ${project.name}`

    const { document, error: docError } = await createDocument({
      organizationId: org.id,
      userId: user.id,
      title,
      content: archiveContent,
      docType: 'project-archive',
      visibility: 'filed',
    })

    if (docError || !document) {
      return Response.json({ error: 'Failed to save archive document' }, { status: 500 })
    }

    const { project: updated, error: updateError } = await updateProject(projectId, org.id, {
      status: 'archived',
    })

    if (updateError || !updated) {
      console.error('[projects/archive] Failed to update project status:', updateError)
      return Response.json(
        { error: 'Archive was saved but project status could not be updated' },
        { status: 500 },
      )
    }

    return Response.json({
      document,
      project: { id: projectId, status: 'archived' as const },
    })
  } catch (err) {
    console.error('[projects/archive] Unexpected error:', err)
    return Response.json({ error: 'Internal error' }, { status: 500 })
  }
}
