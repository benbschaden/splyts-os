import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { getOrganizationForUser } from '@/lib/queries/organizations'
import { createOutput } from '@/lib/queries/outputs'
import { getModelById, DEFAULT_MODEL } from '@/lib/ai/models'
import { deriveOutputSummary } from '@/lib/ai/output-summary'

const schema = z.object({
  brief: z.string().min(1, 'Brief is required').max(5000),
  content: z.string().min(1, 'Content is required'),
  outputType: z.string().min(1).max(100),
  modelId: z.string().optional(),
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

    const { brief, content, outputType, modelId } = parsed.data
    const model = (modelId ? getModelById(modelId) : null) ?? DEFAULT_MODEL

    const db = createServiceClient()

    const { data: project } = await db
      .from('projects')
      .select('id')
      .eq('id', projectId)
      .eq('organization_id', org.id)
      .is('deleted_at', null)
      .maybeSingle()

    if (!project) return Response.json({ error: 'Project not found' }, { status: 404 })

    const summary = deriveOutputSummary(brief, content, outputType)

    const { output, error: saveError } = await createOutput({
      organizationId: org.id,
      projectId,
      contentTypeId: null,
      brief: `${outputType}: ${brief.trim()}`,
      content: content.trim(),
      summary,
      userId: user.id,
      modelId: model.id,
    })

    if (saveError || !output) {
      return Response.json({ error: 'Failed to save output. Please try again.' }, { status: 500 })
    }

    return Response.json({ output }, { status: 201 })
  } catch {
    return Response.json({ error: 'Internal error' }, { status: 500 })
  }
}
