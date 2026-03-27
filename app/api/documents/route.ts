import { createClient } from '@/lib/supabase/server'
import { getOrganizationForUser } from '@/lib/queries/organizations'
import { getDocuments } from '@/lib/queries/documents'

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

    const org = await getOrganizationForUser(user.id)
    if (!org) return Response.json({ error: 'Not found' }, { status: 404 })

    const documents = await getDocuments(org.id, user.id)
    return Response.json({ documents })
  } catch {
    return Response.json({ error: 'Internal error' }, { status: 500 })
  }
}
