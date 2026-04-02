import { createClient } from '@/lib/supabase/server'
import { getOrganizationForUser } from '@/lib/queries/organizations'
import { canUserFileDocument, getDocumentById, fileDocument } from '@/lib/queries/documents'
import { generateDocumentSummary } from '@/lib/retrieval/summarize'
import { getReviewerTeamsForUser } from '@/lib/queries/teams'
import { indexContent } from '@/lib/indexing/index-content'

export async function POST(
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

    const existing = await getDocumentById(id, org.id)
    if (!existing) return Response.json({ error: 'Not found' }, { status: 404 })
    const reviewerTeamIds = await getReviewerTeamsForUser(user.id, org.id)
    const canFile = canUserFileDocument({
      userId: user.id,
      userRole: org.role,
      document: existing,
      reviewerTeamIds,
    })
    if (!canFile) return Response.json({ error: 'Not found' }, { status: 404 })

    // Generate AI summary if not already present
    const summary = existing.summary ?? await generateDocumentSummary(existing.content, existing.title)

    const { document, error } = await fileDocument(id, user.id, org.id, summary)
    if (error || !document) {
      return Response.json({ error: 'Failed to file document' }, { status: 500 })
    }

    // Trigger embedding update in background (fire-and-forget)
    const appUrl = process.env.NEXT_PUBLIC_APP_URL
    if (appUrl) {
      fetch(`${appUrl}/api/documents/${id}/embed`, {
        method: 'POST',
        headers: { Cookie: _request.headers.get('Cookie') ?? '' },
      }).catch(() => {})
    }

    indexContent('document', document, org.id).catch(err =>
      console.error('[content-index] Index failed:', err)
    )

    return Response.json({ document })
  } catch {
    return Response.json({ error: 'Internal error' }, { status: 500 })
  }
}
