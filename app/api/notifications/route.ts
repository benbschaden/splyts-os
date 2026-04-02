import { createClient } from '@/lib/supabase/server'
import { getOrganizationForUser } from '@/lib/queries/organizations'
import {
  getProjectActivityForUser,
  getUnreadProjectActivityCount,
  markNotificationsRead,
} from '@/lib/queries/project-activity'
import { getUnreadDiscussionCount } from '@/lib/queries/discussions'

/**
 * GET /api/notifications
 *
 * Returns the recent activity feed for the authenticated user and the combined unread count
 * (project activity + unread discussions).
 *
 * Query params:
 *   count_only=true  — return only { unread_count } without the full activity list
 */
export async function GET(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

    const org = await getOrganizationForUser(user.id)
    if (!org) return Response.json({ error: 'Not found' }, { status: 404 })

    const url = new URL(request.url)
    const countOnly = url.searchParams.get('count_only') === 'true'

    const [activityCount, discussionCount] = await Promise.all([
      getUnreadProjectActivityCount(user.id, org.id),
      getUnreadDiscussionCount(user.id, org.id),
    ])

    const unreadCount = activityCount + discussionCount

    if (countOnly) {
      return Response.json({ unread_count: unreadCount })
    }

    const activity = await getProjectActivityForUser(user.id, org.id)

    return Response.json({ activity, unread_count: unreadCount, activity_unread: activityCount })
  } catch {
    return Response.json({ error: 'Internal error' }, { status: 500 })
  }
}

/**
 * POST /api/notifications/mark-read
 *
 * Marks all project activity notifications as read by updating
 * the user's notifications_last_read_at timestamp.
 */
export async function POST() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

    await markNotificationsRead(user.id)
    return Response.json({ ok: true })
  } catch {
    return Response.json({ error: 'Internal error' }, { status: 500 })
  }
}
