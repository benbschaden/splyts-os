export const dynamic = 'force-dynamic'

import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getOrganizationForUser } from '@/lib/queries/organizations'
import { getProjectById } from '@/lib/queries/projects'
import { ProjectDetail } from '@/components/projects/project-detail'

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function ProjectPage({ params }: PageProps) {
  const { id } = await params

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const org = await getOrganizationForUser(user.id)
  if (!org) redirect('/setup')

  const project = await getProjectById(id, org.id)
  if (!project) notFound()

  return (
    <ProjectDetail
      project={project}
      isAdmin={org.role === 'admin'}
    />
  )
}
