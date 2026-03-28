import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getOrganizationForUser } from '@/lib/queries/organizations'
import { getOrgMembersWithProfiles } from '@/lib/queries/teams'

export async function GET() {
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

  const members = await getOrgMembersWithProfiles(org.id)
  return NextResponse.json({ data: members })
}
