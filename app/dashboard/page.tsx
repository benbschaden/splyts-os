export const dynamic = 'force-dynamic'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getOrganizationForUser } from '@/lib/queries/organizations'
import { getProjectsForOrg } from '@/lib/queries/projects'
import { getUserProfile } from '@/lib/queries/user-profile'
import { ProjectsList } from '@/components/projects/projects-list'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const org = await getOrganizationForUser(user.id)
  if (!org) redirect('/setup')

  const [projects, profile] = await Promise.all([
    getProjectsForOrg(org.id),
    getUserProfile(user.id),
  ])

  const userName = profile?.full_name?.trim()
    || user.email?.split('@')[0]
    || ''

  return <ProjectsList projects={projects} userName={userName} />
}
