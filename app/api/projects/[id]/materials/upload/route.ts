import { randomUUID } from 'crypto'
import { waitUntil } from '@vercel/functions'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { getOrganizationForUser } from '@/lib/queries/organizations'
import { createProjectMaterial } from '@/lib/queries/project-materials'
import { extractText } from '@/lib/company/extract-text'
import { indexContent } from '@/lib/indexing/index-content'
import { indexMaterialChunks } from '@/lib/indexing/chunk-material'
import { logProjectActivity } from '@/lib/queries/project-activity'

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
  'application/msword',
  'application/json',
  'text/markdown',
  'text/x-markdown',
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
  'application/msword': 'doc',
  'application/json': 'json',
  'text/markdown': 'md',
  'text/x-markdown': 'md',
}

// Browsers sometimes report application/octet-stream for files they don't recognise
// (common for .md on macOS). Fall back to extension-based MIME detection so known
// safe types still pass the whitelist.
const EXT_FALLBACK_MIME: Record<string, string> = {
  md: 'text/markdown',
  txt: 'text/plain',
  csv: 'text/csv',
  json: 'application/json',
  pdf: 'application/pdf',
  doc: 'application/msword',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
}

function resolvedMime(file: File): string {
  if (file.type && file.type !== 'application/octet-stream') return file.type
  const ext = file.name.split('.').pop()?.toLowerCase() ?? ''
  return EXT_FALLBACK_MIME[ext] ?? file.type
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
      console.error('[upload] rejected: no file in form data')
      return Response.json({ error: 'file is required' }, { status: 400 })
    }

    const mime = resolvedMime(file)
    console.log(`[upload] received file="${file.name}" mime="${mime}" raw="${file.type}" size=${file.size}`)

    if (!ALLOWED_MIME_TYPES.has(mime)) {
      console.error(`[upload] rejected: mime type not allowed mime="${mime}" raw="${file.type}" file="${file.name}"`)
      return Response.json({ error: 'File type not allowed' }, { status: 400 })
    }

    if (file.size > MAX_BYTES) {
      console.error(`[upload] rejected: file too large size=${file.size} file="${file.name}"`)
      return Response.json({ error: 'File must be 50MB or smaller' }, { status: 400 })
    }

    const ext = extensionForFile(file)
    const storagePath = `${org.id}/${projectId}/${randomUUID()}.${ext}`

    // Read into a buffer once. Passing a File object to the Supabase SDK causes it to
    // read file.type directly, which may still be "application/octet-stream" even when
    // we pass contentType in the options. An ArrayBuffer forces it to use our mime value.
    const fileBuffer = await file.arrayBuffer()

    const service = createServiceClient()
    const { error: uploadError } = await service.storage
      .from(BUCKET)
      .upload(storagePath, fileBuffer, { contentType: mime, upsert: false })

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
      'text/x-markdown',
      'text/csv',
      'application/json',
    ])
    if (extractableMimes.has(mime)) {
      try {
        if (mime === 'text/csv' || mime === 'application/json') {
          // extractText only supports pdf/docx/txt/md; handle csv + json as plain text
          const text = Buffer.from(fileBuffer).toString('utf-8')
          extractedContent = text.trim() || null
        } else {
          const mimeForExtraction = mime === 'text/x-markdown' ? 'text/markdown' : mime
          const text = await extractText(Buffer.from(fileBuffer), mimeForExtraction)
          extractedContent = text || null
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
      file_mime: mime,
    })

    if (error || !material) {
      return Response.json({ error: error ?? 'Failed to save material' }, { status: 500 })
    }

    waitUntil(
      Promise.all([
        indexContent('project_material', material, org.id).catch(err =>
          console.error('[content-index] Index failed:', err)
        ),
        indexMaterialChunks({
          id: material.id,
          content: material.content ?? null,
          title: material.title ?? null,
          file_name: material.file_name ?? null,
          project_id: projectId,
          material_type: 'file',
          created_by: user.id,
        }, org.id).catch(err =>
          console.error('[content-index] Chunk indexing failed:', err)
        ),
      ])
    )

    logProjectActivity({
      organizationId: org.id,
      projectId,
      actorUserId: user.id,
      actionType: 'file_uploaded',
      entityName: file.name || null,
    })

    return Response.json(
      { material: { ...material, file_url: signed.signedUrl } },
      { status: 201 },
    )
  } catch (error) {
    console.error('[projects/[id]/materials/upload POST]', error)
    return Response.json({ error: 'Internal error' }, { status: 500 })
  }
}
