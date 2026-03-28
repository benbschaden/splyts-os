import { createClient } from '@/lib/supabase/server'
import { getOrganizationForUser } from '@/lib/queries/organizations'
import { getPendingReviewDocuments } from '@/lib/queries/documents'
import { getReviewerTeamsForUser } from '@/lib/queries/teams'

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

    const org = await getOrganizationForUser(user.id)
    if (!org) return Response.json({ error: 'Not found' }, { status: 404 })

    const reviewerTeamIds = await getReviewerTeamsForUser(user.id, org.id)
    const documents = await getPendingReviewDocuments(org.id, reviewerTeamIds, org.role)

    return Response.json({ documents })
  } catch {
    return Response.json({ error: 'Internal error' }, { status: 500 })
  }
}
