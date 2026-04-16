import { randomUUID } from 'crypto'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { getOrganizationForUser } from '@/lib/queries/organizations'
import { appendAttachmentPaths } from '@/lib/queries/contact-communications'

const BUCKET = 'communication-attachments'
const MAX_BYTES = 10_485_760 // 10 MiB

const ALLOWED_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
])

const MIME_TO_EXT: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/gif': 'gif',
  'image/webp': 'webp',
}

function resolvedMime(file: File): string {
  if (file.type && ALLOWED_MIME_TYPES.has(file.type)) return file.type
  const ext = file.name.split('.').pop()?.toLowerCase() ?? ''
  const extMap: Record<string, string> = {
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    png: 'image/png',
    gif: 'image/gif',
    webp: 'image/webp',
  }
  return extMap[ext] ?? file.type
}

export async function POST(request: Request): Promise<Response> {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

    const org = await getOrganizationForUser(user.id)
    if (!org) return Response.json({ error: 'Not found' }, { status: 404 })

    const formData = await request.formData()
    const file = formData.get('file')
    const commId = formData.get('communication_id')

    if (!file || !(file instanceof File)) {
      return Response.json({ error: 'file is required' }, { status: 400 })
    }
    if (!commId || typeof commId !== 'string') {
      return Response.json({ error: 'communication_id is required' }, { status: 400 })
    }

    // Verify the communication belongs to this org
    const db = createServiceClient()
    const { data: comm } = await db
      .from('contact_communications')
      .select('id')
      .eq('id', commId)
      .eq('organization_id', org.id)
      .is('deleted_at', null)
      .maybeSingle()

    if (!comm) return Response.json({ error: 'Not found' }, { status: 404 })

    const mime = resolvedMime(file)
    if (!ALLOWED_MIME_TYPES.has(mime)) {
      return Response.json(
        { error: 'Only images are supported (JPEG, PNG, GIF, WebP)' },
        { status: 400 },
      )
    }
    if (file.size > MAX_BYTES) {
      return Response.json({ error: 'Images must be 10 MB or smaller' }, { status: 400 })
    }

    const ext = MIME_TO_EXT[mime] ?? 'jpg'
    const storagePath = `${org.id}/${commId}/${randomUUID()}.${ext}`
    const fileBuffer = await file.arrayBuffer()

    const storage = createServiceClient()
    const { error: uploadError } = await storage.storage
      .from(BUCKET)
      .upload(storagePath, fileBuffer, { contentType: mime, upsert: false })

    if (uploadError) {
      console.error('[contact-communications/upload] Storage error:', uploadError)
      return Response.json({ error: 'Failed to upload image' }, { status: 500 })
    }

    const { error: appendError } = await appendAttachmentPaths(commId, org.id, [storagePath])
    if (appendError) {
      console.error('[contact-communications/upload] Append paths error:', appendError)
      return Response.json({ error: 'Failed to save image reference' }, { status: 500 })
    }

    // Return a short-lived signed URL for immediate display
    const { data: signedData } = await storage.storage
      .from(BUCKET)
      .createSignedUrl(storagePath, 3600)

    return Response.json(
      { storage_path: storagePath, signed_url: signedData?.signedUrl ?? null },
      { status: 201 },
    )
  } catch (err) {
    console.error('[contact-communications/upload POST]', err)
    return Response.json({ error: 'Internal error' }, { status: 500 })
  }
}
