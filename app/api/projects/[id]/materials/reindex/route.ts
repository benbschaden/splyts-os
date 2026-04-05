import { createClient } from '@/lib/supabase/server'
import { getOrganizationForUser } from '@/lib/queries/organizations'
import { getProjectMaterials } from '@/lib/queries/project-materials'
import { indexMaterialChunks } from '@/lib/indexing/chunk-material'

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  try {
    const { id: projectId } = await params

    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

    const org = await getOrganizationForUser(user.id)
    if (!org) return Response.json({ error: 'Not found' }, { status: 404 })

    const materials = await getProjectMaterials(projectId, org.id)

    const fileMaterials = materials.filter(
      (m) => m.material_type === 'file' && m.content && m.content.length >= 200,
    )

    // Fire-and-forget: kick off indexing and return immediately
    Promise.all(
      fileMaterials.map((m) =>
        indexMaterialChunks(
          {
            id: m.id,
            content: m.content ?? null,
            title: m.title ?? null,
            file_name: m.file_name ?? null,
            project_id: projectId,
            material_type: m.material_type,
            created_by: m.created_by,
          },
          org.id,
        ).catch((err) =>
          console.error(`[materials/reindex] Failed for material ${m.id}:`, err),
        ),
      ),
    ).catch((err) => console.error('[materials/reindex] Batch failed:', err))

    return Response.json({
      message: `Reindexing ${fileMaterials.length} file material(s) in background`,
      count: fileMaterials.length,
    })
  } catch (error) {
    console.error('[materials/reindex POST]', error)
    return Response.json({ error: 'Internal error' }, { status: 500 })
  }
}
