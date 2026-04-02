import { createServiceClient } from '@/lib/supabase/service'

// -------------------------------------------------------
// Types
// -------------------------------------------------------

export type ActivityActionType =
  | 'output_generated'
  | 'file_uploaded'
  | 'note_added'
  | 'link_added'
  | 'discussion_started'
  | 'discussion_resolved'

export interface ProjectActivityRow {
  id: string
  organization_id: string
  project_id: string
  actor_user_id: string
  action_type: ActivityActionType
  entity_name: string | null
  created_at: string
  // joined
  actor_name: string | null
  actor_avatar: string | null
  project_name: string | null
}

// -------------------------------------------------------
// Log (fire-and-forget)
// -------------------------------------------------------

export function logProjectActivity(input: {
  organizationId: string
  projectId: string
  actorUserId: string
  actionType: ActivityActionType
  entityName?: string | null
}): void {
  const supabase = createServiceClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
  ;(supabase as any)
    .from('project_activity')
    .insert({
      organization_id: input.organizationId,
      project_id: input.projectId,
      actor_user_id: input.actorUserId,
      action_type: input.actionType,
      entity_name: input.entityName ?? null,
    })
    .then(({ error }: { error: unknown }) => {
      if (error) console.error('[project-activity] Failed to log:', error)
    })
}

// -------------------------------------------------------
// Fetch activity feed for a user (excludes their own actions)
// -------------------------------------------------------

export async function getProjectActivityForUser(
  userId: string,
  organizationId: string,
  limit = 30,
): Promise<ProjectActivityRow[]> {
  const supabase = createServiceClient()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
  const { data: rows, error } = await (supabase as any)
    .from('project_activity')
    .select('id, organization_id, project_id, actor_user_id, action_type, entity_name, created_at')
    .eq('organization_id', organizationId)
    .neq('actor_user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error || !rows || !Array.isArray(rows)) return []

  // Enrich with actor profiles and project names
  const actorIds = [...new Set((rows as Array<{ actor_user_id: string }>).map((r) => r.actor_user_id))]
  const projectIds = [...new Set((rows as Array<{ project_id: string }>).map((r) => r.project_id))]

  const [{ data: profiles }, { data: projects }] = await Promise.all([
    supabase.from('user_profiles').select('id, full_name, avatar_url').in('id', actorIds),
    supabase.from('projects').select('id, name').in('id', projectIds).is('deleted_at', null),
  ])

  const profileMap: Record<string, { full_name: string | null; avatar_url: string | null }> = {}
  if (profiles) {
    for (const p of profiles as Array<{ id: string; full_name: string | null; avatar_url: string | null }>) {
      profileMap[p.id] = { full_name: p.full_name, avatar_url: p.avatar_url }
    }
  }

  const projectMap: Record<string, string> = {}
  if (projects) {
    for (const p of projects as Array<{ id: string; name: string }>) {
      projectMap[p.id] = p.name
    }
  }

  return (rows as Array<{
    id: string
    organization_id: string
    project_id: string
    actor_user_id: string
    action_type: ActivityActionType
    entity_name: string | null
    created_at: string
  }>).map((r) => ({
    ...r,
    actor_name: profileMap[r.actor_user_id]?.full_name ?? null,
    actor_avatar: profileMap[r.actor_user_id]?.avatar_url ?? null,
    project_name: projectMap[r.project_id] ?? null,
  }))
}

// -------------------------------------------------------
// Unread count (activity by others since last read)
// -------------------------------------------------------

export async function getUnreadProjectActivityCount(
  userId: string,
  organizationId: string,
): Promise<number> {
  const supabase = createServiceClient()

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('notifications_last_read_at')
    .eq('id', userId)
    .maybeSingle()

  const lastRead = (profile as { notifications_last_read_at: string | null } | null)
    ?.notifications_last_read_at ?? null

  // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
  let query = (supabase as any)
    .from('project_activity')
    .select('id', { count: 'exact', head: true })
    .eq('organization_id', organizationId)
    .neq('actor_user_id', userId)

  if (lastRead) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
    query = query.gt('created_at', lastRead)
  }

  const { count, error } = await query
  if (error) return 0
  return (count as number | null) ?? 0
}

// -------------------------------------------------------
// Mark notifications as read
// -------------------------------------------------------

export async function markNotificationsRead(userId: string): Promise<void> {
  const supabase = createServiceClient()
  await supabase
    .from('user_profiles')
    .update({ notifications_last_read_at: new Date().toISOString() } as Record<string, unknown>)
    .eq('id', userId)
}
