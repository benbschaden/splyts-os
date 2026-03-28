import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { getOrganizationForUser } from '@/lib/queries/organizations'
import {
  getKnowledgeFileById,
  softDeleteKnowledgeFile,
} from '@/lib/queries/company-knowledge'

const BUCKET = 'company-knowledge'

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

    const org = await getOrganizationForUser(user.id)
    if (!org) return Response.json({ error: 'Not found' }, { status: 404 })

    if (org.role !== 'admin') {
      return Response.json({ error: 'Not found' }, { status: 404 })
    }

    const { id } = await params

    const { data: file } = await getKnowledgeFileById(supabase, id, org.id)
    if (!file) return Response.json({ error: 'Not found' }, { status: 404 })

    const service = createServiceClient()

    const { error } = await softDeleteKnowledgeFile(service, id, org.id)
    if (error) {
      console.error('[company-knowledge/[id] DELETE]', error)
      return Response.json({ error: 'Failed to delete file' }, { status: 500 })
    }

    service.storage
      .from(BUCKET)
      .remove([file.file_url])
      .catch((err: unknown) => {
        console.error('[company-knowledge/[id] DELETE] Storage remove:', err)
      })

    return Response.json({ ok: true })
  } catch (err) {
    console.error('[company-knowledge/[id] DELETE]', err)
    return Response.json({ error: 'Internal error' }, { status: 500 })
  }
}
