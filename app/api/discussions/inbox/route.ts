import { createClient } from '@/lib/supabase/server'
import { getOrganizationForUser } from '@/lib/queries/organizations'
import { getDiscussionsInboxForUser, getUnreadDiscussionCount } from '@/lib/queries/discussions'

export async function GET(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

    const org = await getOrganizationForUser(user.id)
    if (!org) return Response.json({ error: 'Not found' }, { status: 404 })

    const url = new URL(request.url)
    const countOnly = url.searchParams.get('count_only') === 'true'

    if (countOnly) {
      const count = await getUnreadDiscussionCount(user.id, org.id)
      return Response.json({ unread_count: count })
    }

    const discussions = await getDiscussionsInboxForUser(user.id, org.id)
    return Response.json({ discussions })
  } catch {
    return Response.json({ error: 'Internal error' }, { status: 500 })
  }
}
