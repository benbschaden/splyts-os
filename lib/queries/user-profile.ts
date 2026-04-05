import { createServiceClient } from '@/lib/supabase/service'

export interface UserProfileData {
  full_name: string | null
  role: string | null
  avatar_url: string | null
  voice: string | null
  tone: string | null
  writing_style: string | null
  personal_pillars: string | null
  platform_notes: string | null
}

const CORE_COLUMNS = 'id, full_name, role, avatar_url, updated_at'
const VOICE_COLUMNS = 'id, full_name, role, avatar_url, voice, tone, writing_style, personal_pillars, platform_notes, updated_at'

/** Core profile fetch — only selects base columns.
 *  Safe to call in layout/auth flows. */
export async function getUserProfile(userId: string) {
  const supabase = createServiceClient()

  const { data, error } = await supabase
    .from('user_profiles')
    .select(CORE_COLUMNS)
    .eq('id', userId)
    .maybeSingle()

  if (error) return null
  return data
}

/** Full profile fetch including voice fields. */
export async function getUserProfileWithVoice(userId: string) {
  const supabase = createServiceClient()

  const { data, error } = await supabase
    .from('user_profiles')
    .select(VOICE_COLUMNS)
    .eq('id', userId)
    .maybeSingle()

  if (error) return null
  return data
}

/** Display names for outputs / activity lists (user id → full_name). */
export async function getUserDisplayNamesByIds(userIds: string[]): Promise<Record<string, string | null>> {
  const unique = [...new Set(userIds)].filter(Boolean)
  if (unique.length === 0) return {}

  const supabase = createServiceClient()
  const { data, error } = await supabase
    .from('user_profiles')
    .select('id, full_name')
    .in('id', unique)

  if (error || !data) return {}
  return Object.fromEntries(data.map((p) => [p.id, p.full_name]))
}

export type UserProfileSummary = { full_name: string | null; avatar_url: string | null }

/** Names + avatars for message streams (user id → { full_name, avatar_url }). */
export async function getUserDisplayNamesAndAvatarsByIds(
  userIds: string[],
): Promise<Record<string, UserProfileSummary>> {
  const unique = [...new Set(userIds)].filter(Boolean)
  if (unique.length === 0) return {}

  const supabase = createServiceClient()
  const { data, error } = await supabase
    .from('user_profiles')
    .select('id, full_name, avatar_url')
    .in('id', unique)

  if (error || !data) return {}
  return Object.fromEntries(
    data.map((p) => [p.id, { full_name: p.full_name ?? null, avatar_url: p.avatar_url ?? null }]),
  )
}

export async function upsertUserProfile(userId: string, profile: UserProfileData) {
  const supabase = createServiceClient()

  const { data, error } = await supabase
    .from('user_profiles')
    .upsert(
      {
        id: userId,
        ...profile,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'id' },
    )
    .select(VOICE_COLUMNS)
    .single()

  if (error) return { profile: null, error: 'Failed to save profile' }
  return { profile: data, error: null }
}

export async function updateAvatarUrl(userId: string, avatarUrl: string) {
  const supabase = createServiceClient()

  const { error } = await supabase
    .from('user_profiles')
    .upsert(
      {
        id: userId,
        avatar_url: avatarUrl,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'id' },
    )

  if (error) return { error: 'Failed to update avatar' }
  return { error: null }
}

/** All org members as author options for generation dialogs and backlog.
 *  Returns { id: user_id, name: full_name } for every member with a profile. */
export async function getOrgMembersAsAuthors(
  organizationId: string,
): Promise<Array<{ id: string; name: string }>> {
  const supabase = createServiceClient()

  const { data: members, error } = await supabase
    .from('organization_members')
    .select('user_id')
    .eq('organization_id', organizationId)

  if (error || !members || members.length === 0) return []

  const userIds = members.map((m) => m.user_id)

  const { data: profiles } = await supabase
    .from('user_profiles')
    .select('id, full_name')
    .in('id', userIds)
    .not('full_name', 'is', null)

  if (!profiles) return []

  return profiles
    .filter((p) => p.full_name)
    .map((p) => ({ id: p.id, name: p.full_name! }))
}
