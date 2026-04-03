import { randomUUID } from 'crypto'
import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { getOrganizationForUser } from '@/lib/queries/organizations'
import { createCohortDocument, updateCohortDocument } from '@/lib/queries/cohort-documents'
import { getContactsForOrg } from '@/lib/queries/contacts'
import {
  buildCohortExtractionPrompt,
  buildPerRespondentExtractionPrompt,
  buildPatternConsolidationPrompt,
  type ExtractedInsightDraft,
  type RespondentInsightResult,
  type ConsolidatedInsightDraft,
  type AttributedRespondent,
} from '@/lib/ai/prompts'
import { extractText } from '@/lib/company/extract-text'

const BUCKET = 'cohort-files'
const MAX_BYTES = 52_428_800 // 50 MiB
const BATCH_SIZE = 12 // respondents per Opus call

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

// ----------------------------------------------------------------
// Survey (per-respondent) detection and extraction
// ----------------------------------------------------------------

const EMAIL_HEADER_PATTERNS = ['email', 'e-mail', 'email address', 'respondent email', 'mail']
const NAME_HEADER_PATTERNS = ['name', 'full name', 'first name', 'respondent', 'username', 'contact name']

interface SurveyRow {
  email: string | null
  name: string | null
  answers: Record<string, string>
}

interface ParsedSurvey {
  rows: SurveyRow[]
  questionColumns: string[]
}

function tryParseSurvey(buffer: Buffer, mime: string): ParsedSurvey | null {
  if (mime !== 'text/csv' && mime !== 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet') return null

  try {
    const XLSX = require('xlsx') as typeof import('xlsx')
    const wb = XLSX.read(buffer, { type: 'buffer' })
    const sheet = wb.Sheets[wb.SheetNames[0]]
    const rawRows = XLSX.utils.sheet_to_json<Record<string, string>>(sheet, { defval: '' })
    if (rawRows.length < 2) return null

    const headers = Object.keys(rawRows[0])

    const emailCol = headers.find((h) =>
      EMAIL_HEADER_PATTERNS.some((p) => h.toLowerCase().includes(p)),
    ) ?? null
    const nameCol = headers.find((h) =>
      NAME_HEADER_PATTERNS.some((p) => h.toLowerCase().includes(p)),
    ) ?? null

    // Require at least one identity column to be considered a survey
    if (!emailCol && !nameCol) return null

    const identitySet = new Set([emailCol, nameCol].filter(Boolean) as string[])
    const questionColumns = headers.filter((h) => !identitySet.has(h))

    const rows: SurveyRow[] = rawRows.map((row) => {
      const answers: Record<string, string> = {}
      for (const col of questionColumns) {
        const val = String(row[col] ?? '').trim()
        if (val) answers[col] = val
      }
      return {
        email: emailCol ? (String(row[emailCol] ?? '').trim() || null) : null,
        name: nameCol ? (String(row[nameCol] ?? '').trim() || null) : null,
        answers,
      }
    }).filter((r) => Object.keys(r.answers).length > 0)

    if (rows.length === 0) return null

    return { rows, questionColumns }
  } catch {
    return null
  }
}

function formatRespondentsText(rows: SurveyRow[], startIndex = 0): string {
  return rows.map((r, i) => {
    const key = `R${startIndex + i + 1}`
    const identity = [r.name, r.email].filter(Boolean).join(' <') + (r.email ? '>' : '')
    const header = identity || `Respondent ${startIndex + i + 1}`
    const qa = Object.entries(r.answers)
      .map(([q, a]) => `Q: ${q}\nA: ${a}`)
      .join('\n\n')
    return `${key} — ${header}\n${qa}`
  }).join('\n\n---\n\n')
}

function parseInsightJson(raw: string): RespondentInsightResult[] {
  const jsonStart = raw.indexOf('[')
  const jsonEnd = raw.lastIndexOf(']')
  if (jsonStart === -1 || jsonEnd === -1) return []

  const parsed = JSON.parse(raw.slice(jsonStart, jsonEnd + 1))
  if (!Array.isArray(parsed)) return []

  const validCategories = new Set(['pain_point', 'feature_request', 'praise', 'objection', 'churn_signal', 'usage_pattern', 'market_insight'])
  const validImpact = new Set(['high', 'medium', 'low'])

  return parsed
    .filter((item) => item && typeof item === 'object')
    .map((item): RespondentInsightResult => ({
      email: typeof item.email === 'string' ? item.email : null,
      name: typeof item.name === 'string' ? item.name : null,
      insights: Array.isArray(item.insights)
        ? item.insights.filter(
            (ins: ExtractedInsightDraft) =>
              ins &&
              typeof ins.content === 'string' &&
              ins.content.trim().length > 0 &&
              validCategories.has(ins.category) &&
              validImpact.has(ins.impact),
          ).slice(0, 8)
        : [],
    }))
    .filter((r) => r.email || r.name)
}

type RespondentWithContact = RespondentInsightResult & {
  contact_id: string | null
  contact_name: string | null
  respondent_key: string
}

type ContactLookup = {
  byEmail: Map<string, { id: string; name: string }>
  byName: Map<string, { id: string; name: string }>
}

function matchContact(
  email: string | null,
  name: string | null,
  lookup: ContactLookup,
): { contact_id: string | null; contact_name: string | null } {
  if (email) {
    const match = lookup.byEmail.get(email.toLowerCase())
    if (match) return { contact_id: match.id, contact_name: match.name }
  }
  if (name) {
    const match = lookup.byName.get(name.toLowerCase())
    if (match) return { contact_id: match.id, contact_name: match.name }
  }
  return { contact_id: null, contact_name: null }
}

async function runPerRespondentExtractionBatched(
  survey: ParsedSurvey,
  lookup: ContactLookup,
  segment: string,
  fileName: string,
): Promise<RespondentWithContact[]> {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) return []

  const anthropic = new Anthropic({ apiKey })
  const allParsed: RespondentInsightResult[] = []

  // Process in batches to stay within token limits
  const batches: SurveyRow[][] = []
  for (let i = 0; i < survey.rows.length; i += BATCH_SIZE) {
    batches.push(survey.rows.slice(i, i + BATCH_SIZE))
  }

  let globalOffset = 0
  for (const batch of batches) {
    const respondentsText = formatRespondentsText(batch, globalOffset)
    const prompt = buildPerRespondentExtractionPrompt({ respondentsText, segment, fileName })

    try {
      const message = await anthropic.messages.create({
        model: 'claude-opus-4-5',
        max_tokens: 16000,
        messages: [{ role: 'user', content: prompt }],
      })

      const textBlock = message.content.find((b) => b.type === 'text')
      if (textBlock && textBlock.type === 'text') {
        const batchResults = parseInsightJson(textBlock.text.trim())
        allParsed.push(...batchResults)
      }
    } catch (err) {
      console.error(`[cohort-documents/upload] Batch extraction error (offset ${globalOffset}):`, err)
    }

    globalOffset += batch.length
  }

  // Assign respondent keys and match contacts
  return allParsed.map((r, i): RespondentWithContact => {
    const key = `R${i + 1}`
    const { contact_id, contact_name } = matchContact(r.email, r.name, lookup)
    return { ...r, contact_id, contact_name, respondent_key: key }
  })
}

async function runConsolidation(
  respondents: RespondentWithContact[],
  segment: string,
): Promise<ConsolidatedInsightDraft[]> {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey || respondents.length === 0) return []

  // Build a lookup map from respondent_key -> RespondentWithContact
  const respondentMap = new Map(respondents.map((r) => [r.respondent_key, r]))

  // Format all respondents' insights for the consolidation prompt
  const insightsText = respondents.map((r) => {
    const label = r.name ?? r.email ?? r.respondent_key
    const insightLines = r.insights.map((ins) => `  [${ins.category} · ${ins.impact}] ${ins.content}`)
    return `${r.respondent_key} (${label}):\n${insightLines.join('\n')}`
  }).join('\n\n')

  const prompt = buildPatternConsolidationPrompt({
    insightsText,
    segment,
    totalRespondents: respondents.length,
  })

  try {
    const anthropic = new Anthropic({ apiKey })
    const message = await anthropic.messages.create({
      model: 'claude-opus-4-5',
      max_tokens: 16000,
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

    const validCategories = new Set(['pain_point', 'feature_request', 'praise', 'objection', 'churn_signal', 'usage_pattern', 'market_insight'])
    const validImpact = new Set(['high', 'medium', 'low'])

    const consolidated: ConsolidatedInsightDraft[] = []

    for (const item of parsed) {
      if (!item || typeof item.content !== 'string' || !item.content.trim()) continue
      if (!validCategories.has(item.category) || !validImpact.has(item.impact)) continue

      const keys: string[] = Array.isArray(item.respondent_keys)
        ? item.respondent_keys.filter((k: unknown) => typeof k === 'string')
        : []

      const attributed: AttributedRespondent[] = keys
        .map((k) => {
          const r = respondentMap.get(k)
          if (!r) return null
          return {
            respondent_key: k,
            name: r.name,
            email: r.email,
            contact_id: r.contact_id,
            contact_name: r.contact_name,
          } satisfies AttributedRespondent
        })
        .filter((a): a is AttributedRespondent => a !== null)

      consolidated.push({
        content: item.content.trim(),
        category: item.category,
        impact: item.impact,
        respondent_keys: keys,
        attributed_respondents: attributed,
      })
    }

    return consolidated
  } catch (err) {
    console.error('[cohort-documents/upload] Consolidation error:', err)
    return []
  }
}

// ----------------------------------------------------------------

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
      model: 'claude-opus-4-5',
      max_tokens: 8192,
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

    // Detect per-respondent survey mode before general text extraction
    const survey = tryParseSurvey(buffer, mime)

    // Extract text for storage (always)
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

    if (survey) {
      // Build contact lookup maps once — reused for both extraction and all_survey_respondents
      const orgContacts = await getContactsForOrg(org.id)
      const lookup: ContactLookup = {
        byEmail: new Map(orgContacts.filter((c) => c.email).map((c) => [c.email!.toLowerCase(), { id: c.id, name: c.name }])),
        byName: new Map(orgContacts.map((c) => [c.name.toLowerCase(), { id: c.id, name: c.name }])),
      }

      // Build the full list of every CSV row with contact matching — used for "Create contacts"
      // This covers ALL respondents regardless of whether Opus extracted insights for them
      const allSurveyRespondents = survey.rows.map((row) => {
        const { contact_id, contact_name } = matchContact(row.email, row.name, lookup)
        return { name: row.name, email: row.email, contact_id, contact_name }
      })

      // Pass 1: Per-respondent extraction in batches using Claude Opus
      const respondents = await runPerRespondentExtractionBatched(survey, lookup, segment, file.name)

      const respondentsWithAnyInsights = respondents.filter((r) => r.insights.length > 0)

      if (respondentsWithAnyInsights.length === 0) {
        await updateCohortDocument(doc.id, org.id, { status: 'failed' })
        return Response.json({
          document: doc,
          mode: 'per_respondent',
          consolidated: [],
          respondents,
          all_survey_respondents: allSurveyRespondents,
          total_respondents: survey.rows.length,
          extracted_respondents: 0,
        }, { status: 201 })
      }

      // Pass 2: Consolidate patterns — only feed respondents who have insights
      const respondentsWithInsights = respondents.filter((r) => r.insights.length > 0)
      const consolidated = await runConsolidation(respondentsWithInsights, segment)

      await updateCohortDocument(doc.id, org.id, { status: 'processed' })

      return Response.json({
        document: doc,
        mode: 'per_respondent',
        respondents,
        consolidated,
        all_survey_respondents: allSurveyRespondents,
        total_respondents: survey.rows.length,
        extracted_respondents: respondentsWithInsights.length,
      }, { status: 201 })
    }

    // Thematic mode: extract insights from full text
    let drafts: ExtractedInsightDraft[] = []
    if (extractedText) {
      drafts = await runAiExtraction(extractedText, segment, file.name)
      await updateCohortDocument(doc.id, org.id, {
        status: drafts.length > 0 ? 'processed' : 'failed',
      })
    }

    return Response.json({ document: doc, mode: 'thematic', drafts }, { status: 201 })
  } catch (error) {
    console.error('[cohort-documents/upload POST]', error)
    return Response.json({ error: 'Internal error' }, { status: 500 })
  }
}
