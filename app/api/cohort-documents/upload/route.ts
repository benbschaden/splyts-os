import { randomUUID } from 'crypto'
import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { getOrganizationForUser } from '@/lib/queries/organizations'
import { createCohortDocument, updateCohortDocument } from '@/lib/queries/cohort-documents'
import { buildCohortExtractionPrompt, type ExtractedInsightDraft } from '@/lib/ai/prompts'
import { extractText } from '@/lib/company/extract-text'

const BUCKET = 'cohort-files'
const MAX_BYTES = 52_428_800 // 50 MiB

const VALID_SEGMENTS = new Set([
  'beta_user', 'free_user', 'customer', 'power_user', 'prospect', 'churned', 'other',
])

const ALLOWED_MIME_TYPES = new Set([
  'text/csv',
  'text/plain',
  'text/markdown',
  'text/x-markdown',
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/json',
])

const EXT_FALLBACK_MIME: Record<string, string> = {
  csv: 'text/csv',
  txt: 'text/plain',
  md: 'text/markdown',
  json: 'application/json',
  pdf: 'application/pdf',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
}

const MIME_TO_EXT: Record<string, string> = {
  'text/csv': 'csv',
  'text/plain': 'txt',
  'text/markdown': 'md',
  'text/x-markdown': 'md',
  'application/pdf': 'pdf',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'xlsx',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
  'application/json': 'json',
}

function resolvedMime(file: File): string {
  if (file.type && file.type !== 'application/octet-stream') return file.type
  const ext = file.name.split('.').pop()?.toLowerCase() ?? ''
  return EXT_FALLBACK_MIME[ext] ?? file.type
}

function extensionForFile(file: File): string {
  const fromName = file.name?.split('.').pop()
  if (fromName && /^[a-zA-Z0-9]{1,8}$/.test(fromName)) return fromName.toLowerCase()
  return MIME_TO_EXT[file.type] ?? 'bin'
}

async function extractTextFromBuffer(buffer: Buffer, mime: string): Promise<string | null> {
  try {
    if (mime === 'text/csv' || mime === 'application/json') {
      return buffer.toString('utf-8').slice(0, 60_000)
    }

    if (mime === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet') {
      const XLSX = await import('xlsx')
      const workbook = XLSX.read(buffer, { type: 'buffer' })
      const parts: string[] = []
      for (const sheetName of workbook.SheetNames) {
        const sheet = workbook.Sheets[sheetName]
        const csv = XLSX.utils.sheet_to_csv(sheet)
        if (csv.trim()) {
          parts.push(`Sheet: ${sheetName}`)
          parts.push(csv.slice(0, 20_000))
        }
      }
      return parts.join('\n\n').slice(0, 60_000) || null
    }

    if (
      mime === 'application/pdf' ||
      mime === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
      mime === 'text/plain' ||
      mime === 'text/markdown' ||
      mime === 'text/x-markdown'
    ) {
      const normMime = mime === 'text/x-markdown' ? 'text/markdown' : mime
      const text = await extractText(buffer, normMime)
      return text.slice(0, 60_000) || null
    }

    return null
  } catch {
    return null
  }
}

async function runAiExtraction(
  text: string,
  segment: string,
  fileName: string,
): Promise<ExtractedInsightDraft[]> {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) return []

  const prompt = buildCohortExtractionPrompt({ documentText: text, segment, fileName })
  const anthropic = new Anthropic({ apiKey })

  try {
    const message = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 4096,
      messages: [{ role: 'user', content: prompt }],
    })

    const textBlock = message.content.find((b) => b.type === 'text')
    if (!textBlock || textBlock.type !== 'text') return []

    const raw = textBlock.text.trim()
    const jsonStart = raw.indexOf('[')
    const jsonEnd = raw.lastIndexOf(']')
    if (jsonStart === -1 || jsonEnd === -1) return []

    const parsed = JSON.parse(raw.slice(jsonStart, jsonEnd + 1))
    if (!Array.isArray(parsed)) return []

    const valid = ['pain_point', 'feature_request', 'praise', 'objection', 'churn_signal', 'usage_pattern', 'market_insight']
    const validImpact = ['high', 'medium', 'low']

    return parsed
      .filter(
        (item): item is ExtractedInsightDraft =>
          item &&
          typeof item.content === 'string' &&
          item.content.trim().length > 0 &&
          valid.includes(item.category) &&
          validImpact.includes(item.impact),
      )
      .slice(0, 20)
  } catch {
    return []
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

    const org = await getOrganizationForUser(user.id)
    if (!org) return Response.json({ error: 'Not found' }, { status: 404 })

    const formData = await request.formData()
    const file = formData.get('file')
    const segment = formData.get('segment')
    const projectId = formData.get('projectId')

    if (!file || !(file instanceof File)) {
      return Response.json({ error: 'file is required' }, { status: 400 })
    }
    if (!segment || typeof segment !== 'string' || !VALID_SEGMENTS.has(segment)) {
      return Response.json({ error: 'valid segment is required' }, { status: 400 })
    }
    if (!projectId || typeof projectId !== 'string') {
      return Response.json({ error: 'projectId is required' }, { status: 400 })
    }

    // Verify project belongs to this org
    const db = createServiceClient()
    const { data: project } = await db
      .from('projects')
      .select('id')
      .eq('id', projectId)
      .eq('organization_id', org.id)
      .eq('tool_key', 'customer_hub')
      .is('deleted_at', null)
      .maybeSingle()

    if (!project) return Response.json({ error: 'Not found' }, { status: 404 })

    const mime = resolvedMime(file)
    if (!ALLOWED_MIME_TYPES.has(mime)) {
      return Response.json({ error: 'File type not allowed. Use CSV, XLSX, PDF, DOCX, TXT, or Markdown.' }, { status: 400 })
    }
    if (file.size > MAX_BYTES) {
      return Response.json({ error: 'File must be 50MB or smaller' }, { status: 400 })
    }

    const ext = extensionForFile(file)
    const storagePath = `${org.id}/${projectId}/${randomUUID()}.${ext}`
    const fileBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(fileBuffer)

    // Upload to storage
    const storage = createServiceClient()
    const { error: uploadError } = await storage.storage
      .from(BUCKET)
      .upload(storagePath, fileBuffer, { contentType: mime, upsert: false })

    if (uploadError) {
      console.error('[cohort-documents/upload] Storage error:', uploadError)
      return Response.json({ error: 'Failed to upload file' }, { status: 500 })
    }

    // Extract text
    const extractedText = await extractTextFromBuffer(buffer, mime)

    // Create DB record
    const { doc, error: createError } = await createCohortDocument({
      organizationId: org.id,
      projectId,
      userId: user.id,
      segment: segment as Parameters<typeof createCohortDocument>[0]['segment'],
      fileName: file.name,
      fileMime: mime,
      storagePath,
      extractedText,
    })

    if (createError || !doc) {
      return Response.json({ error: 'Failed to save document' }, { status: 500 })
    }

    // Run AI extraction if we have text
    let drafts: ExtractedInsightDraft[] = []
    if (extractedText) {
      drafts = await runAiExtraction(extractedText, segment, file.name)
      // Update document status
      await updateCohortDocument(doc.id, org.id, {
        status: drafts.length > 0 ? 'processed' : 'failed',
      })
    }

    return Response.json({ document: doc, drafts }, { status: 201 })
  } catch (error) {
    console.error('[cohort-documents/upload POST]', error)
    return Response.json({ error: 'Internal error' }, { status: 500 })
  }
}
