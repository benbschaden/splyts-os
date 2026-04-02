import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { getOrganizationForUser } from '@/lib/queries/organizations'
import { getCohortDocumentById, deleteCohortDocument } from '@/lib/queries/cohort-documents'

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

    const org = await getOrganizationForUser(user.id)
    if (!org) return Response.json({ error: 'Not found' }, { status: 404 })

    const doc = await getCohortDocumentById(id, org.id)
    if (!doc) return Response.json({ error: 'Not found' }, { status: 404 })

    // Remove from storage
    const storage = createServiceClient()
    await storage.storage.from('cohort-files').remove([doc.storage_path])

    const { error } = await deleteCohortDocument(id, org.id)
    if (error) return Response.json({ error }, { status: 500 })

    return new Response(null, { status: 204 })
  } catch (error) {
    console.error('[cohort-documents/[id] DELETE]', error)
    return Response.json({ error: 'Internal error' }, { status: 500 })
  }
}
