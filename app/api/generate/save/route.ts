import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { getOrganizationForUser } from '@/lib/queries/organizations'
import { createOutput } from '@/lib/queries/outputs'
import { createServiceClient } from '@/lib/supabase/service'
import { getModelById, DEFAULT_MODEL } from '@/lib/ai/models'
import { deriveOutputSummary } from '@/lib/ai/output-summary'
import { indexContent } from '@/lib/indexing/index-content'

const schema = z.object({
  projectId: z.string().uuid(),
  contentTypeId: z.string().uuid(),
  brief: z.string().min(1, 'Brief is required').max(5000),
  content: z.string().min(1, 'Content is required'),
  contentTypeName: z.string().optional(),
  modelId: z.string().optional(),
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

    const { projectId, contentTypeId, brief, content, contentTypeName, modelId } = parsed.data
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

    // Verify content type belongs to this org
    const { data: contentType } = await db
      .from('content_types')
      .select('id, name')
      .eq('id', contentTypeId)
      .eq('organization_id', org.id)
      .eq('is_active', true)
      .is('deleted_at', null)
      .maybeSingle()

    if (!contentType) return Response.json({ error: 'Content type not found' }, { status: 404 })

    const summary = deriveOutputSummary(
      brief,
      content,
      contentTypeName ?? (contentType as { id: string; name: string }).name,
    )

    const { output, error: saveError } = await createOutput({
      organizationId: org.id,
      projectId,
      contentTypeId,
      brief,
      content,
      summary,
      userId: user.id,
      modelId: model.id,
    })

    if (saveError || !output) {
      return Response.json({ error: 'Failed to save output. Please try again.' }, { status: 500 })
    }

    indexContent('output', output, org.id).catch(err =>
      console.error('[content-index] Index failed:', err)
    )

    return Response.json({ output }, { status: 201 })
  } catch {
    return Response.json({ error: 'Internal error' }, { status: 500 })
  }
}
