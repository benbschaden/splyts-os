export const dynamic = 'force-dynamic'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getOrganizationForUser } from '@/lib/queries/organizations'
import { getDocuments, getPendingReviewDocuments } from '@/lib/queries/documents'
import { DocumentsList } from '@/components/documents/documents-list'
import { getReviewerTeamsForUser } from '@/lib/queries/teams'

export default async function DocumentsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const org = await getOrganizationForUser(user.id)
  if (!org) redirect('/setup')

  const reviewerTeamIds = await getReviewerTeamsForUser(user.id, org.id)
  const [documents, pendingReviewDocuments] = await Promise.all([
    getDocuments(org.id, user.id),
    getPendingReviewDocuments(org.id, reviewerTeamIds, org.role),
  ])

  return (
    <DocumentsList
      documents={documents}
      pendingReviewDocuments={pendingReviewDocuments}
      canReview={org.role === 'admin' || reviewerTeamIds.length > 0}
    />
  )
}
