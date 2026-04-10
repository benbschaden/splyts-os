import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { getOrganizationForUser } from '@/lib/queries/organizations'
import { getProjectMaterialFileRow } from '@/lib/queries/project-materials'
import { checkRateLimit } from '@/lib/api-rate-limit'

const BUCKET = 'project-files'
const SIGNED_URL_TTL_SEC = 3600

/**
 * GET — issue a short-lived signed URL for the material's stored file.
 * Default: 302 redirect to Supabase Storage (for window.open / navigation).
 * ?format=json — return { url } for fetch + programmatic download of body.
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string; materialId: string }> },
) {
  try {
    const { id: projectId, materialId } = await params
    const url = new URL(request.url)
    const formatJson = url.searchParams.get('format') === 'json'

    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (!checkRateLimit(`material-file:${user.id}`, 120, 60_000)) {
      return Response.json({ error: 'Too many requests' }, { status: 429 })
    }

    const org = await getOrganizationForUser(user.id)
    if (!org) {
      return Response.json({ error: 'Not found' }, { status: 404 })
    }

    const db = createServiceClient()
    const { data: project } = await db
      .from('projects')
      .select('id')
      .eq('id', projectId)
      .eq('organization_id', org.id)
      .is('deleted_at', null)
      .maybeSingle()

    if (!project) {
      return Response.json({ error: 'Not found' }, { status: 404 })
    }

    const row = await getProjectMaterialFileRow(materialId, projectId, org.id)
    if (!row || row.material_type !== 'file' || !row.file_url?.trim()) {
      return Response.json({ error: 'Not found' }, { status: 404 })
    }

    const storagePath = row.file_url.trim()
    if (storagePath.startsWith('http://') || storagePath.startsWith('https://')) {
      console.error('[materials/file GET] unexpected full URL in file_url')
      return Response.json({ error: 'Internal error' }, { status: 500 })
    }

    const service = createServiceClient()
    const { data: signed, error: signError } = await service.storage
      .from(BUCKET)
      .createSignedUrl(storagePath, SIGNED_URL_TTL_SEC)

    if (signError || !signed?.signedUrl) {
      console.error('[materials/file GET] Signed URL:', signError)
      return Response.json({ error: 'Internal error' }, { status: 500 })
    }

    if (formatJson) {
      return Response.json(
        { url: signed.signedUrl },
        {
          headers: {
            'Cache-Control': 'private, no-store',
          },
        },
      )
    }

    return Response.redirect(signed.signedUrl, 302)
  } catch (error) {
    console.error('[projects/.../materials/.../file GET]', error)
    return Response.json({ error: 'Internal error' }, { status: 500 })
  }
}
