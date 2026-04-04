import { createServiceClient } from '@/lib/supabase/service'
import { getUserDisplayNamesByIds } from '@/lib/queries/user-profile'
import { isAtLeastAdmin } from '@/lib/auth/roles'

export interface PlaybookRow {
  id: string
  organization_id: string
  created_by: string
  title: string
  category: string
  content: string
  created_at: string
  updated_at: string
  deleted_at: string | null
}

export interface PlaybookWithOwner extends PlaybookRow {
  owner_name: string | null
}

const PLAYBOOK_SELECT = 'id, organization_id, created_by, title, category, content, created_at, updated_at, deleted_at'

export async function getPlaybooks(organizationId: string): Promise<PlaybookWithOwner[]> {
  const supabase = createServiceClient()

  const { data, error } = await supabase
    .from('playbooks')
    .select(PLAYBOOK_SELECT)
    .eq('organization_id', organizationId)
    .is('deleted_at', null)
    .order('category', { ascending: true })
    .order('title', { ascending: true })

  if (error || !data) return []

  const rows = data as PlaybookRow[]
  const creatorIds = [...new Set(rows.map((r) => r.created_by))]
  const nameMap = await getUserDisplayNamesByIds(creatorIds)

  return rows.map((r) => ({ ...r, owner_name: nameMap[r.created_by] ?? null }))
}

export async function getPlaybookById(
  id: string,
  organizationId: string,
): Promise<PlaybookWithOwner | null> {
  const supabase = createServiceClient()

  const { data, error } = await supabase
    .from('playbooks')
    .select(PLAYBOOK_SELECT)
    .eq('id', id)
    .eq('organization_id', organizationId)
    .is('deleted_at', null)
    .maybeSingle()

  if (error || !data) return null

  const row = data as PlaybookRow
  const nameMap = await getUserDisplayNamesByIds([row.created_by])
  return { ...row, owner_name: nameMap[row.created_by] ?? null }
}

export async function createPlaybook(input: {
  organizationId: string
  userId: string
  title: string
  category: string
}): Promise<{ playbook: PlaybookRow | null; error: string | null }> {
  const supabase = createServiceClient()

  const { data, error } = await supabase
    .from('playbooks')
    .insert({
      organization_id: input.organizationId,
      created_by: input.userId,
      title: input.title,
      category: input.category,
      content: '',
    })
    .select(PLAYBOOK_SELECT)
    .single()

  if (error) return { playbook: null, error: 'Failed to create playbook' }
  return { playbook: data as PlaybookRow, error: null }
}

export async function updatePlaybook(
  id: string,
  userId: string,
  userRole: string,
  updates: Partial<Pick<PlaybookRow, 'title' | 'category' | 'content'>>,
): Promise<{ playbook: PlaybookRow | null; error: string | null }> {
  const supabase = createServiceClient()

  // Admins and owners can edit any playbook; members can only edit their own.
  // We enforce this at the API layer; RLS enforces creator-only at DB level.
  // For admins we bypass RLS restriction by using service role + explicit check here.
  let query = supabase
    .from('playbooks')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .is('deleted_at', null)

  if (!isAtLeastAdmin(userRole)) {
    query = query.eq('created_by', userId)
  }

  const { data, error } = await query.select(PLAYBOOK_SELECT).single()

  if (error) return { playbook: null, error: 'Failed to update playbook' }
  return { playbook: data as PlaybookRow, error: null }
}

export async function deletePlaybook(
  id: string,
  userId: string,
  userRole: string,
): Promise<{ error: string | null }> {
  const supabase = createServiceClient()

  let query = supabase
    .from('playbooks')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id)

  if (!isAtLeastAdmin(userRole)) {
    query = query.eq('created_by', userId)
  }

  const { error } = await query

  if (error) return { error: 'Failed to delete playbook' }
  return { error: null }
}

export function canEditPlaybook(userId: string, userRole: string, playbook: PlaybookRow): boolean {
  if (isAtLeastAdmin(userRole)) return true
  return playbook.created_by === userId
}
