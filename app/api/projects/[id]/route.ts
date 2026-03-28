import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { getOrganizationForUser } from '@/lib/queries/organizations'
import { getProjectById, updateProject, deleteProject } from '@/lib/queries/projects'

const updateProjectSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  description: z.string().max(1000).nullable().optional(),
  visibility: z.enum(['private', 'organization', 'team', 'specific_users']).optional(),
  teamIds: z.array(z.string().uuid()).optional(),
  memberIds: z.array(z.string().uuid()).optional(),
})

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
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

  const { id } = await params

  // Fetch the project without visibility check — needed to verify creator
  const project = await getProjectById(id, org.id)
  if (!project) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  // Only the creator or an org admin may update a project
  const isCreator = project.created_by === user.id
  const isAdmin = org.role === 'admin'
  if (!isCreator && !isAdmin) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const body = await request.json()
  const parsed = updateProjectSchema.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.flatten().fieldErrors },
      { status: 400 },
    )
  }

  const { project: updated, error } = await updateProject(id, org.id, {
    ...parsed.data,
    grantedBy: user.id,
  })

  if (error || !updated) {
    return NextResponse.json({ error }, { status: 500 })
  }

  return NextResponse.json({ data: updated })
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const org = await getOrganizationForUser(user.id)
  if (!org || org.role !== 'admin') {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const { id } = await params
  const { error } = await deleteProject(id, org.id)

  if (error) {
    return NextResponse.json({ error }, { status: 500 })
  }

  return NextResponse.json({ data: null }, { status: 200 })
}
