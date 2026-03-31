import { randomUUID } from 'crypto'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { getOrganizationForUser } from '@/lib/queries/organizations'
import { createProjectMaterial } from '@/lib/queries/project-materials'
import { extractText } from '@/lib/company/extract-text'

const BUCKET = 'project-files'
const MAX_BYTES = 52_428_800 // 50 MiB — matches bucket policy

const ALLOWED_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'image/svg+xml',
  'application/pdf',
  'text/csv',
  'text/plain',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/json',
  'text/markdown',
])

const MIME_TO_EXT: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
  'image/svg+xml': 'svg',
  'application/pdf': 'pdf',
  'text/csv': 'csv',
  'text/plain': 'txt',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'xlsx',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
  'application/json': 'json',
  'text/markdown': 'md',
}

function extensionForFile(file: File): string {
  const fromName = file.name?.split('.').pop()
  if (fromName && /^[a-zA-Z0-9]{1,8}$/.test(fromName)) {
    return fromName.toLowerCase()
  }
  return MIME_TO_EXT[file.type] ?? 'bin'
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

    const org = await getOrganizationForUser(user.id)
    if (!org) return Response.json({ error: 'Not found' }, { status: 404 })

    const { id: projectId } = await params

    const db = createServiceClient()
    const { data: project } = await db
      .from('projects')
      .select('id')
      .eq('id', projectId)
      .eq('organization_id', org.id)
      .is('deleted_at', null)
      .maybeSingle()

    if (!project) return Response.json({ error: 'Not found' }, { status: 404 })

    const formData = await request.formData()
    const file = formData.get('file')
    if (!file || !(file instanceof File)) {
      return Response.json({ error: 'file is required' }, { status: 400 })
    }

    if (!ALLOWED_MIME_TYPES.has(file.type)) {
      return Response.json({ error: 'File type not allowed' }, { status: 400 })
    }

    if (file.size > MAX_BYTES) {
      return Response.json({ error: 'File must be 50MB or smaller' }, { status: 400 })
    }

    const ext = extensionForFile(file)
    const storagePath = `${org.id}/${projectId}/${randomUUID()}.${ext}`

    const service = createServiceClient()
    const { error: uploadError } = await service.storage
      .from(BUCKET)
      .upload(storagePath, file, { contentType: file.type, upsert: false })

    if (uploadError) {
      console.error('[projects/[id]/materials/upload] Storage upload:', uploadError)
      return Response.json({ error: 'Failed to upload file' }, { status: 500 })
    }

    const { data: signed, error: signError } = await service.storage
      .from(BUCKET)
      .createSignedUrl(storagePath, 3600)

    if (signError || !signed?.signedUrl) {
      console.error('[projects/[id]/materials/upload] Signed URL:', signError)
      return Response.json({ error: 'Failed to prepare file' }, { status: 500 })
    }

    // Extract text content so AI prompts can read the document.
    // Runs after successful storage upload; failure is non-fatal (content stays null).
    let extractedContent: string | null = null
    const extractableMimes = new Set([
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain',
      'text/markdown',
      'text/csv',
      'application/json',
    ])
    if (extractableMimes.has(file.type)) {
      try {
        if (file.type === 'text/csv' || file.type === 'application/json') {
          // extractText only supports pdf/docx/txt/md; handle csv + json as plain text
          const text = await file.text()
          extractedContent = text.slice(0, 60_000) || null
        } else {
          const buffer = Buffer.from(await file.arrayBuffer())
          const text = await extractText(buffer, file.type)
          extractedContent = text.slice(0, 60_000) || null
        }
      } catch (err) {
        console.error('[projects/[id]/materials/upload] text extraction failed:', err)
      }
    }

    const { material, error } = await createProjectMaterial(projectId, org.id, user.id, {
      material_type: 'file',
      title: file.name || null,
      content: extractedContent,
      file_url: storagePath,
      file_name: file.name || 'upload',
      file_mime: file.type,
    })

    if (error || !material) {
      return Response.json({ error: error ?? 'Failed to save material' }, { status: 500 })
    }

    return Response.json(
      { material: { ...material, file_url: signed.signedUrl } },
      { status: 201 },
    )
  } catch (error) {
    console.error('[projects/[id]/materials/upload POST]', error)
    return Response.json({ error: 'Internal error' }, { status: 500 })
  }
}
