import { createClient } from '@/lib/supabase/server'
import { getOrganizationForUser } from '@/lib/queries/organizations'
import { listKnowledgeFiles } from '@/lib/queries/company-knowledge'

export async function GET() {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

    const org = await getOrganizationForUser(user.id)
    if (!org) return Response.json({ error: 'Not found' }, { status: 404 })

    const { data: files, error } = await listKnowledgeFiles(supabase, org.id)
    if (error) {
      console.error('[company-knowledge GET]', error)
      return Response.json({ error: 'Failed to load files' }, { status: 500 })
    }

    return Response.json({ files: files ?? [] })
  } catch (err) {
    console.error('[company-knowledge GET]', err)
    return Response.json({ error: 'Internal error' }, { status: 500 })
  }
}
