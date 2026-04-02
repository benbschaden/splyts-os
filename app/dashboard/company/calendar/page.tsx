export const dynamic = 'force-dynamic'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getOrganizationForUser } from '@/lib/queries/organizations'
import { ContentCalendar } from '@/components/company/content-calendar'
import { isAtLeastAdmin } from '@/lib/auth/roles'

export default async function ContentCalendarPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const org = await getOrganizationForUser(user.id)
  if (!org) redirect('/setup')

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h2 className="text-sm font-semibold text-foreground">Content calendar</h2>
        <p className="text-sm text-muted-foreground">
          Plan and track content across all platforms. Link generated outputs directly to calendar items.
        </p>
      </div>
      <ContentCalendar isAdmin={isAtLeastAdmin(org.role)} />
    </div>
  )
}
