import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getOrganizationForUser } from '@/lib/queries/organizations'
import { getUserProfile } from '@/lib/queries/user-profile'
import { Sidebar } from '@/components/sidebar'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const [org, profile] = await Promise.all([
    getOrganizationForUser(user.id),
    getUserProfile(user.id),
  ])

  if (!org) redirect('/setup')

  const displayName = profile?.full_name?.trim().split(' ')[0]
    || user.email?.split('@')[0]
    || ''

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar
        orgName={org.name}
        userName={displayName}
        avatarUrl={profile?.avatar_url ?? null}
        email={user.email ?? ''}
        isAdmin={org.role === 'admin'}
      />
      <main className="flex-1 overflow-y-auto">
        {children}
      </main>
    </div>
  )
}
