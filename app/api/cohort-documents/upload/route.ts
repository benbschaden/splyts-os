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
const BATCH_SIZE = 6 // respondents per Opus call — smaller batches reduce per-respondent truncation

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

// Patterns that exclusively indicate a first name column — "name" alone is kept for full-name fallback
const FIRST_NAME_PATTERNS = ['first name', 'firstname', 'first_name', 'given name']
const LAST_NAME_PATTERNS = ['last name', 'lastname', 'last_name', 'surname', 'family name']
// Fallback full-name patterns (used only when no separate first/last cols found)
const FULL_NAME_PATTERNS = [
  'full name', 'your name', 'contact name', 'username', 'respondent',
  'first and last', 'first & last', 'first & last name',
  'name',  // intentionally last — "name" is a short substring, keep more specific patterns first
]

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
    const lc = (h: string) => h.toLowerCase()

    const emailCol = headers.find((h) =>
      EMAIL_HEADER_PATTERNS.some((p) => lc(h).includes(p)),
    ) ?? null

    // Detect separate first + last name columns (common in Google Forms)
    const firstNameCol = headers.find((h) =>
      FIRST_NAME_PATTERNS.some((p) => lc(h).includes(p)),
    ) ?? null
    const lastNameCol = headers.find((h) =>
      LAST_NAME_PATTERNS.some((p) => lc(h).includes(p)),
    ) ?? null

    // Fall back to a single full-name column only when no separate cols found
    const fullNameCol = (firstNameCol || lastNameCol)
      ? null
      : (headers.find((h) => FULL_NAME_PATTERNS.some((p) => lc(h).includes(p))) ?? null)

    // Require at least one identity column to be considered a survey
    if (!emailCol && !firstNameCol && !lastNameCol && !fullNameCol) return null

    const identitySet = new Set([emailCol, firstNameCol, lastNameCol, fullNameCol].filter(Boolean) as string[])
    const questionColumns = headers.filter((h) => !identitySet.has(h))

    const rows: SurveyRow[] = rawRows.map((row) => {
      const answers: Record<string, string> = {}
      for (const col of questionColumns) {
        const val = String(row[col] ?? '').trim()
        if (val) answers[col] = val
      }

      let name: string | null = null
      if (firstNameCol || lastNameCol) {
        const first = firstNameCol ? String(row[firstNameCol] ?? '').trim() : ''
        const last = lastNameCol ? String(row[lastNameCol] ?? '').trim() : ''
        name = [first, last].filter(Boolean).join(' ') || null
      } else if (fullNameCol) {
        name = String(row[fullNameCol] ?? '').trim() || null
      }

      return {
        email: emailCol ? (String(row[emailCol] ?? '').trim() || null) : null,
        name,
        answers,
      }
    }).filter((r) => Object.keys(r.answers).length > 0 || r.email || r.name)

    if (rows.length === 0) return null

    return { rows, questionColumns }
  } catch {
    return null
  }
}

const MAX_CHARS_PER_RESPONDENT = 3000 // prevent any single respondent from eating the whole context

function formatRespondentsText(rows: SurveyRow[], startIndex = 0): string {
  return rows.map((r, i) => {
    const key = `R${startIndex + i + 1}`
    const identity = [r.name, r.email].filter(Boolean).join(' <') + (r.email ? '>' : '')
    const header = identity || `Respondent ${startIndex + i + 1}`
    const qa = Object.entries(r.answers)
      .map(([q, a]) => `Q: ${q}\nA: ${a}`)
      .join('\n\n')
      .slice(0, MAX_CHARS_PER_RESPONDENT)
    return `${key} — ${header}\n${qa}`
  }).join('\n\n---\n\n')
}

interface ParsedRespondentResult extends RespondentInsightResult {
  respondent_key: string | null
}

function parseInsightJson(raw: string): ParsedRespondentResult[] {
  const jsonStart = raw.indexOf('[')
  const jsonEnd = raw.lastIndexOf(']')
  if (jsonStart === -1 || jsonEnd === -1) return []

  let parsed: unknown[]
  try {
    parsed = JSON.parse(raw.slice(jsonStart, jsonEnd + 1))
  } catch {
    return []
  }
  if (!Array.isArray(parsed)) return []

  const validCategories = new Set(['pain_point', 'feature_request', 'praise', 'objection', 'churn_signal', 'usage_pattern', 'market_insight'])
  const validImpact = new Set(['high', 'medium', 'low'])

  return parsed
    .filter((item) => item && typeof item === 'object')
    .map((item): ParsedRespondentResult => ({
      respondent_key: typeof (item as Record<string, unknown>).respondent_key === 'string' ? (item as Record<string, unknown>).respondent_key as string : null,
      email: typeof (item as Record<string, unknown>).email === 'string' ? (item as Record<string, unknown>).email as string : null,
      name: typeof (item as Record<string, unknown>).name === 'string' ? (item as Record<string, unknown>).name as string : null,
      insights: Array.isArray((item as Record<string, unknown>).insights)
        ? ((item as Record<string, unknown>).insights as ExtractedInsightDraft[]).filter(
            (ins) =>
              ins &&
              typeof ins.content === 'string' &&
              ins.content.trim().length > 0 &&
              validCategories.has(ins.category) &&
              validImpact.has(ins.impact),
          ).slice(0, 8)
        : [],
    }))
    .filter((r) => r.respondent_key || r.email || r.name)
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
    const match = lookup.byEmail.get(email.trim().toLowerCase())
    if (match) return { contact_id: match.id, contact_name: match.name }
  }
  if (name) {
    const match = lookup.byName.get(name.trim().toLowerCase())
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

  // Build the global key → original survey row map upfront
  const globalRows: Array<{ key: string; row: SurveyRow }> = survey.rows.map((row, i) => ({
    key: `R${i + 1}`,
    row,
  }))

  // keyed by respondent_key → final result
  const resultsByKey = new Map<string, RespondentWithContact>()

  // Process in batches
  const batches: Array<{ key: string; row: SurveyRow }[]> = []
  for (let i = 0; i < globalRows.length; i += BATCH_SIZE) {
    batches.push(globalRows.slice(i, i + BATCH_SIZE))
  }

  for (const batch of batches) {
    const batchOffset = parseInt(batch[0].key.slice(1)) - 1 // e.g. "R7" → offset 6
    const respondentsText = formatRespondentsText(batch.map((b) => b.row), batchOffset)
    const prompt = buildPerRespondentExtractionPrompt({ respondentsText, segment, fileName })

    let batchResults: ParsedRespondentResult[] = []
    try {
      const message = await anthropic.messages.create({
        model: 'claude-opus-4-5',
        max_tokens: 16000,
        messages: [{ role: 'user', content: prompt }],
      })

      const textBlock = message.content.find((b) => b.type === 'text')
      if (textBlock && textBlock.type === 'text') {
        batchResults = parseInsightJson(textBlock.text.trim())
      }
    } catch (err) {
      console.error(`[cohort-documents/upload] Batch extraction error (batch starting ${batch[0].key}):`, err)
    }

    // Index AI results by respondent_key for lookup
    const aiByKey = new Map<string, ParsedRespondentResult>()
    for (const r of batchResults) {
      if (r.respondent_key) aiByKey.set(r.respondent_key, r)
    }

    // Ensure EVERY respondent in this batch has an entry — fill gaps with empty insights
    for (const { key, row } of batch) {
      const aiResult = aiByKey.get(key)
      const { contact_id, contact_name } = matchContact(
        aiResult?.email ?? row.email,
        aiResult?.name ?? row.name,
        lookup,
      )
      resultsByKey.set(key, {
        respondent_key: key,
        email: aiResult?.email ?? row.email,
        name: aiResult?.name ?? row.name,
        insights: aiResult?.insights ?? [],
        contact_id,
        contact_name,
      })
    }
  }

  // Return in original order
  return globalRows.map(({ key }) => resultsByKey.get(key)!).filter(Boolean)
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

      // CODE-LEVEL COVERAGE GUARANTEE
      // After consolidation, any respondent who had insights in Pass 1 but wasn't
      // attributed to any pattern gets their best insight added as a standalone entry.
      // This ensures every respondent with data gets at least one insight linked to them.
      const coveredKeys = new Set(
        consolidated.flatMap((c) => c.respondent_keys),
      )
      const uncoveredRespondents = respondentsWithInsights.filter(
        (r) => !coveredKeys.has(r.respondent_key),
      )
      const standaloneFallbacks: ConsolidatedInsightDraft[] = uncoveredRespondents.map((r) => {
        const best = r.insights.reduce((a, b) => {
          const rank = { high: 3, medium: 2, low: 1 } as Record<string, number>
          return (rank[b.impact] ?? 0) > (rank[a.impact] ?? 0) ? b : a
        })
        return {
          content: best.content,
          category: best.category,
          impact: best.impact,
          respondent_keys: [r.respondent_key],
          attributed_respondents: [{
            respondent_key: r.respondent_key,
            name: r.name,
            email: r.email,
            contact_id: r.contact_id,
            contact_name: r.contact_name,
          }],
        }
      })

      const finalConsolidated = [...consolidated, ...standaloneFallbacks]

      await updateCohortDocument(doc.id, org.id, { status: 'processed' })

      return Response.json({
        document: doc,
        mode: 'per_respondent',
        respondents,
        consolidated: finalConsolidated,
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
