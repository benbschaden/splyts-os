import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { getOrganizationForUser } from '@/lib/queries/organizations'
import { getDocumentById, updateDocument, deleteDocument } from '@/lib/queries/documents'

const updateSchema = z.object({
  title: z.string().min(1).max(255).optional(),
  content: z.string().optional(),
  doc_type: z.string().min(1).max(100).optional(),
  version: z.number().int().optional(),
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

    const { version: expectedVersion, ...updates } = parsed.data

    const { document, error, conflict } = await updateDocument(
      id,
      user.id,
      updates,
      expectedVersion,
    )

    if (conflict) {
      return Response.json(
        { error: 'Document was modified by someone else', currentVersion: existing.version },
        { status: 409 },
      )
    }

    if (error || !document) {
      return Response.json({ error: 'Failed to update document' }, { status: 500 })
    }

    // Trigger embedding update in background (fire-and-forget)
    const appUrl = process.env.NEXT_PUBLIC_APP_URL
    if (appUrl && (updates.content !== undefined || updates.title !== undefined)) {
      fetch(`${appUrl}/api/documents/${id}/embed`, {
        method: 'POST',
        headers: { Cookie: request.headers.get('Cookie') ?? '' },
      }).catch(() => {})
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

    const org = await getOrganizationForUser(user.id)
    if (!org) return Response.json({ error: 'Not found' }, { status: 404 })

    const existing = await getDocumentById(id, org.id)
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
