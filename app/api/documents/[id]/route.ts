import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { getOrganizationForUser } from '@/lib/queries/organizations'
import { getDocumentById, updateDocument, deleteDocument } from '@/lib/queries/documents'

const updateSchema = z.object({
  title: z.string().min(1).max(255).optional(),
  content: z.string().optional(),
  doc_type: z.string().min(1).max(100).optional(),
  visibility: z.enum(['private', 'shared', 'filed']).optional(),
})

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

    const org = await getOrganizationForUser(user.id)
    if (!org) return Response.json({ error: 'Not found' }, { status: 404 })

    const document = await getDocumentById(id, org.id)
    if (!document) return Response.json({ error: 'Not found' }, { status: 404 })

    return Response.json({ document })
  } catch {
    return Response.json({ error: 'Internal error' }, { status: 500 })
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

    const org = await getOrganizationForUser(user.id)
    if (!org) return Response.json({ error: 'Not found' }, { status: 404 })

    // Only the creator can update
    const existing = await getDocumentById(id, org.id)
    if (!existing) return Response.json({ error: 'Not found' }, { status: 404 })
    if (existing.created_by !== user.id) {
      return Response.json({ error: 'Not found' }, { status: 404 })
    }

    const body = await request.json()
    const parsed = updateSchema.safeParse(body)
    if (!parsed.success) {
      return Response.json({ error: 'Invalid input' }, { status: 400 })
    }

    const { document, error } = await updateDocument(id, user.id, parsed.data)
    if (error || !document) {
      return Response.json({ error: 'Failed to update document' }, { status: 500 })
    }

    return Response.json({ document })
  } catch {
    return Response.json({ error: 'Internal error' }, { status: 500 })
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

    const existing = await getDocumentById(id, (await getOrganizationForUser(user.id))?.id ?? '')
    if (!existing) return Response.json({ error: 'Not found' }, { status: 404 })
    if (existing.created_by !== user.id) {
      return Response.json({ error: 'Not found' }, { status: 404 })
    }

    const { error } = await deleteDocument(id, user.id)
    if (error) return Response.json({ error }, { status: 500 })

    return new Response(null, { status: 204 })
  } catch {
    return Response.json({ error: 'Internal error' }, { status: 500 })
  }
}
