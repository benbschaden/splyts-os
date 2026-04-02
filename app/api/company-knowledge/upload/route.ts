import { randomUUID } from 'crypto'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { getOrganizationForUser } from '@/lib/queries/organizations'
import {
  createKnowledgeFile,
  updateKnowledgeFileProcessed,
  updateKnowledgeFileFailed,
  getKnowledgeFilesWithText,
  createConflicts,
  deleteConflictsForFilePair,
} from '@/lib/queries/company-knowledge'
import { extractText, SUPPORTED_MIMES, MIME_TO_EXT } from '@/lib/company/extract-text'
import { detectConflicts } from '@/lib/company/conflict-detect'
import { indexContent } from '@/lib/indexing/index-content'

const BUCKET = 'company-knowledge'
const MAX_BYTES = 52_428_800 // 50 MiB

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

    const org = await getOrganizationForUser(user.id)
    if (!org) return Response.json({ error: 'Not found' }, { status: 404 })

    if (org.role !== 'admin') {
      return Response.json({ error: 'Not found' }, { status: 404 })
    }

    const formData = await request.formData()
    const file = formData.get('file')
    if (!file || !(file instanceof File)) {
      return Response.json({ error: 'file is required' }, { status: 400 })
    }

    if (!SUPPORTED_MIMES.has(file.type)) {
      return Response.json(
        { error: 'Only PDF, DOCX, TXT, and MD files are supported' },
        { status: 400 },
      )
    }

    if (file.size > MAX_BYTES) {
      return Response.json({ error: 'File must be 50MB or smaller' }, { status: 400 })
    }

    const ext = MIME_TO_EXT[file.type] ?? 'bin'
    const storagePath = `${org.id}/${randomUUID()}.${ext}`

    // 1. Upload raw file to storage
    const service = createServiceClient()
    const { error: uploadError } = await service.storage
      .from(BUCKET)
      .upload(storagePath, file, { contentType: file.type, upsert: false })

    if (uploadError) {
      console.error('[company-knowledge/upload] Storage upload:', uploadError)
      return Response.json({ error: 'Failed to upload file' }, { status: 500 })
    }

    // 2. Create DB record immediately (status: processing)
    const { data: fileRecord, error: insertError } = await createKnowledgeFile(service, {
      organizationId: org.id,
      createdBy: user.id,
      fileName: file.name || 'upload',
      fileUrl: storagePath,
      fileMime: file.type,
      fileSizeBytes: file.size,
    })

    if (insertError || !fileRecord) {
      console.error('[company-knowledge/upload] DB insert:', insertError)
      return Response.json({ error: 'Failed to save file record' }, { status: 500 })
    }

    // 3. Extract text
    const buffer = Buffer.from(await file.arrayBuffer())
    let processedText: string
    try {
      processedText = await extractText(buffer, file.type)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Text extraction failed'
      await updateKnowledgeFileFailed(service, fileRecord.id, message)
      return Response.json(
        { file: { ...fileRecord, processing_status: 'failed', processing_error: message } },
        { status: 201 },
      )
    }

    // 4. Save extracted text, mark ready
    const { data: readyFile, error: updateError } = await updateKnowledgeFileProcessed(
      service,
      fileRecord.id,
      processedText,
    )

    if (updateError || !readyFile) {
      console.error('[company-knowledge/upload] DB update:', updateError)
      return Response.json({ error: 'Failed to finalize file' }, { status: 500 })
    }

    // 5. Run conflict detection against all other ready files (synchronous)
    try {
      const { data: existingFiles } = await getKnowledgeFilesWithText(service, org.id)
      const otherFiles = (existingFiles ?? []).filter((f) => f.id !== fileRecord.id)

      if (otherFiles.length > 0) {
        const allDocs = [
          { fileName: readyFile.file_name, text: processedText },
          ...otherFiles
            .filter((f): f is typeof f & { processed_text: string } => f.processed_text !== null)
            .map((f) => ({ fileName: f.file_name, text: f.processed_text })),
        ]

        const conflicts = await detectConflicts(allDocs)

        const involvedOtherIds = new Set<string>()
        for (const conflict of conflicts) {
          const other = otherFiles.find(
            (f) => f.file_name === conflict.file_name_a || f.file_name === conflict.file_name_b,
          )
          if (other) involvedOtherIds.add(other.id)
        }

        for (const otherId of involvedOtherIds) {
          await deleteConflictsForFilePair(service, fileRecord.id, otherId)
        }

        for (const conflict of conflicts) {
          const other = otherFiles.find(
            (f) => f.file_name === conflict.file_name_a || f.file_name === conflict.file_name_b,
          )
          if (!other) continue
          await createConflicts(service, org.id, fileRecord.id, other.id, [
            {
              topic: conflict.topic,
              description: conflict.description,
              excerpt_a: conflict.excerpt_a,
              excerpt_b: conflict.excerpt_b,
            },
          ])
        }
      }
    } catch (err) {
      // Conflict detection failure must not block the upload response
      console.error('[company-knowledge/upload] Conflict detection error:', err)
    }

    indexContent('company_knowledge_file', readyFile, org.id).catch(err =>
      console.error('[content-index] Index failed:', err)
    )

    return Response.json({ file: readyFile }, { status: 201 })
  } catch (err) {
    console.error('[company-knowledge/upload POST]', err)
    return Response.json({ error: 'Internal error' }, { status: 500 })
  }
}
