export const dynamic = 'force-dynamic'

import { redirect, notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getOrganizationForUser } from '@/lib/queries/organizations'
import { canUserFileDocument, getDocumentById } from '@/lib/queries/documents'
import { DocumentViewer } from '@/components/documents/document-viewer'
import { getReviewerTeamsForUser } from '@/lib/queries/teams'
import { isAtLeastAdmin } from '@/lib/auth/roles'

export default async function DocumentPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const org = await getOrganizationForUser(user.id)
  if (!org) redirect('/setup')

  const document = await getDocumentById(id, org.id)
  if (!document) notFound()

  // Private docs visible only to creator
  if (document.visibility === 'private' && document.created_by !== user.id) {
    notFound()
  }

  const isOwner = document.created_by === user.id
  const reviewerTeamIds = await getReviewerTeamsForUser(user.id, org.id)
  const canFile = canUserFileDocument({
    userId: user.id,
    userRole: org.role,
    document,
    reviewerTeamIds,
  })

  return (
    <DocumentViewer
      document={document}
      isOwner={isOwner}
      isAdmin={isAtLeastAdmin(org.role)}
      canFile={canFile}
    />
  )
}
