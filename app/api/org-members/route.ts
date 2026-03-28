import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getOrganizationForUser } from '@/lib/queries/organizations'
import { getOrgMembersWithProfiles } from '@/lib/queries/teams'

export async function GET(request: Request) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const org = await getOrganizationForUser(user.id)
  if (!org) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const url = new URL(request.url)
  const excludeSelf = url.searchParams.get('excludeSelf') === 'true'

  let members = await getOrgMembersWithProfiles(org.id)
  if (excludeSelf) {
    members = members.filter((m) => m.user_id !== user.id)
  }

  return NextResponse.json({ data: members, currentUserId: user.id })
}
