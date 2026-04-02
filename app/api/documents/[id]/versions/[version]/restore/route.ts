import { createClient } from '@/lib/supabase/server'
import { getOrganizationForUser } from '@/lib/queries/organizations'
import { restoreDocumentVersion } from '@/lib/queries/documents'
import { indexContent } from '@/lib/indexing/index-content'

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string; version: string }> },
) {
  try {
    const { id, version } = await params
    const targetVersion = parseInt(version, 10)
    if (isNaN(targetVersion)) {
      return Response.json({ error: 'Invalid version' }, { status: 400 })
    }

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

    const org = await getOrganizationForUser(user.id)
    if (!org) return Response.json({ error: 'Not found' }, { status: 404 })

    const { document, error } = await restoreDocumentVersion(id, targetVersion, user.id, org.id)

    if (error || !document) {
      return Response.json({ error: error ?? 'Failed to restore version' }, { status: 500 })
    }

    indexContent('document', document, org.id).catch(err =>
      console.error('[content-index] Index failed:', err)
    )

    return Response.json({ document })
  } catch {
    return Response.json({ error: 'Internal error' }, { status: 500 })
  }
}
