export const dynamic = 'force-dynamic'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getOrganizationForUser } from '@/lib/queries/organizations'
import { getProjectsForOrg } from '@/lib/queries/projects'
import { getUserProfile } from '@/lib/queries/user-profile'
import { ProjectsList } from '@/components/projects/projects-list'

interface ProjectsPageProps {
  searchParams: Promise<{ category?: string }>
}

export default async function ProjectsPage({ searchParams }: ProjectsPageProps) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const org = await getOrganizationForUser(user.id)
  if (!org) redirect('/setup')

  const { category } = await searchParams

  const [allProjects, profile] = await Promise.all([
    getProjectsForOrg(org.id),
    getUserProfile(user.id),
  ])

  const projects = category
    ? allProjects.filter((p) => p.category === category)
    : allProjects

  const fullName = profile?.full_name?.trim() || user.email?.split('@')[0] || ''
  const userName = fullName.split(' ')[0]

  return (
    <ProjectsList
      projects={projects}
      userName={userName}
      activeCategory={category ?? null}
    />
  )
}
