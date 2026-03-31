import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { getOrganizationForUser } from '@/lib/queries/organizations'
import { getOutputsForProject } from '@/lib/queries/outputs'

/**
 * GET project outputs — used by the project Content tab to resync after remount
 * (tab switch unmounts the list; server props stay stale until refresh).
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

    const org = await getOrganizationForUser(user.id)
    if (!org) return Response.json({ error: 'Not found' }, { status: 404 })

    const { id: projectId } = await params

    const db = createServiceClient()
    const { data: project } = await db
      .from('projects')
      .select('id')
      .eq('id', projectId)
      .eq('organization_id', org.id)
      .is('deleted_at', null)
      .maybeSingle()

    if (!project) return Response.json({ error: 'Not found' }, { status: 404 })

    const outputs = await getOutputsForProject(projectId, org.id)
    return Response.json(
      { outputs },
      {
        headers: {
          'Cache-Control': 'private, no-store, must-revalidate',
        },
      },
    )
  } catch (error) {
    console.error('[projects/[id]/outputs GET]', error)
    return Response.json({ error: 'Internal error' }, { status: 500 })
  }
}
