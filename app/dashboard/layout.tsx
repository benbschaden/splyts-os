import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getOrganizationForUser } from '@/lib/queries/organizations'
import { getUserProfile } from '@/lib/queries/user-profile'
import { getBrandContext } from '@/lib/queries/brand-context'
import { getProjectCategories, getProjectsForOrg } from '@/lib/queries/projects'
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

  // New members who haven't completed their profile yet
  if (!profile?.full_name?.trim()) redirect('/welcome')

  const [brandContext, projectCategories, projectsForNav] = await Promise.all([
    getBrandContext(org.id),
    getProjectCategories(org.id),
    getProjectsForOrg(org.id),
  ])

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
        northStar={brandContext?.north_star}
        mission={brandContext?.mission}
        vision={brandContext?.vision}
        projectCategories={projectCategories}
        projectCount={projectsForNav.length}
      />
      <main className="flex-1 overflow-y-auto">
        {children}
      </main>
    </div>
  )
}
