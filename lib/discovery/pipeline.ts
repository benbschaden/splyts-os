/**
 * Chunked map -> verify -> reduce pipeline for discovery entries.
 *
 * - `analyseEntry()`         — full pipeline for a saved entry; persists chunks.
 * - `analyseEntryTransient()` — pipeline for an unsaved drawer-style request;
 *                               nothing is persisted.
 * - `synthesiseStudy()`      — cross-entry reduce-2 step; persists a
 *                               `discovery_study_synthesis_runs` row.
 *
 * See:
 *   - docs/superpowers/specs/2026-04-28-discovery-chunked-analysis-design.md
 *   - docs/features/discovery-chunked-analysis.md
 */

import Anthropic from '@anthropic-ai/sdk'
import OpenAI from 'openai'
import {
  buildChunkExtractionPrompt,
  buildEntryDigestPrompt,
  buildStudySynthesisPrompt,
  DISCOVERY_PROMPT_VERSION,
  type ChunkVerifiedFindingsForReduce,
  type StudyDigestEntry,
} from '@/lib/ai/prompts'
import {
  chunkTranscript,
  normaliseTranscript,
  sha256Hex,
  type DiscoveryChunk,
} from '@/lib/discovery/chunking'
import { verifyQuoteList, verifyQuote } from '@/lib/discovery/verification'
import {
  deleteChunksForEntry,
  getChunksForEntry,
  insertPendingChunks,
  updateChunkResult,
  type DiscoveryChunkRow,
  type VerificationStats,
} from '@/lib/queries/discovery-chunks'
import {
  getEntryAnalysisExtras,
  updateEntryFromPipeline,
  type PipelineEntryAnalysisFields,
} from '@/lib/queries/discovery-entries'
import {
  createSynthesisRun,
  finaliseSynthesisRun,
} from '@/lib/queries/study-synthesis-runs'
import { DEFAULT_MODEL, getModelById, type AIModel } from '@/lib/ai/models'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface EntryDigest {
  sentiment: 'positive' | 'neutral' | 'negative' | 'mixed'
  tags: string[]
  key_quote_1: string | null
  key_quote_2: string | null
  key_quote_3: string | null
  jtbd: string | null
  wtp_signal: 'strong' | 'moderate' | 'weak' | 'none'
  wtp_price_points: number[]
  problem_severity: number | null
  adoption_willingness: number | null
  analysis_markdown: string
}

export interface PipelineProvenance {
  chunks_total: number
  chunks_succeeded: number
  chunks_failed: number
  quotes_returned: number
  quotes_dropped: number
  prompt_version: string
  model_id: string
}

export interface AnalyseEntryParams {
  entryId: string
  organizationId: string
  rawContent: string
  entryType: string
  participant: string | null
  contextNotes: string | null
  studyGoal: string | null
  availableTags: string[]
  modelId?: string
  /**
   * If true and an existing analysis matches the current raw_content hash,
   * skip the entire pipeline and return the persisted digest. Default true.
   */
  reuseIfHashMatches?: boolean
}

export interface AnalyseEntryTransientParams {
  organizationId: string
  rawContent: string
  entryType: string
  participant: string | null
  contextNotes: string | null
  studyGoal: string | null
  availableTags: string[]
  modelId?: string
}

// ---------------------------------------------------------------------------
// Public: per-entry analysis (saved entry)
// ---------------------------------------------------------------------------

export async function analyseEntry(
  params: AnalyseEntryParams,
): Promise<{ digest: EntryDigest; provenance: PipelineProvenance }> {
  const {
    entryId,
    organizationId,
    rawContent,
    availableTags,
    reuseIfHashMatches = true,
  } = params
  const model = resolveModel(params.modelId)

  const normalised = normaliseTranscript(rawContent)
  const hash = await sha256Hex(normalised)

  // Reuse existing digest if the content hasn't changed and chunks succeeded.
  if (reuseIfHashMatches) {
    const existingExtras = await getEntryAnalysisExtras(entryId, organizationId)
    const existingChunks = await getChunksForEntry(entryId, organizationId)
    const allSucceeded =
      existingChunks.length > 0 && existingChunks.every((c) => c.status === 'succeeded')
    if (
      existingExtras?.raw_content_hash === hash &&
      allSucceeded &&
      existingExtras?.analysis_json
    ) {
      const cached = existingExtras.analysis_json as unknown as EntryDigest
      const stats = aggregateChunkStats(existingChunks)
      return {
        digest: cached,
        provenance: {
          chunks_total: existingChunks.length,
          chunks_succeeded: existingChunks.filter((c) => c.status === 'succeeded').length,
          chunks_failed: existingChunks.filter((c) => c.status === 'failed').length,
          quotes_returned: stats.total_quotes_returned,
          quotes_dropped: stats.total_quotes_dropped,
          prompt_version: existingChunks[0]?.prompt_version ?? DISCOVERY_PROMPT_VERSION,
          model_id: existingChunks[0]?.model_id ?? model.id,
        },
      }
    }
  }

  // Otherwise: rebuild chunks from scratch.
  await deleteChunksForEntry(entryId, organizationId)
  const chunks = chunkTranscript(normalised)
  const inserted = await insertPendingChunks(
    chunks.map((c) => ({
      entry_id: entryId,
      organization_id: organizationId,
      chunk_index: c.index,
      start_offset: c.start,
      end_offset: c.end,
      text: c.text,
    })),
  )
  if (inserted.error || inserted.rows.length === 0) {
    throw new Error(inserted.error ?? 'No chunks created from raw_content')
  }

  // Run the map step in parallel (with concurrency cap), persist results.
  const chunkResults = await runMapStepPersisted({
    chunkRows: inserted.rows,
    chunks,
    model,
    entryType: params.entryType,
    participant: params.participant,
    studyGoal: params.studyGoal,
    contextNotes: params.contextNotes,
    availableTags,
    organizationId,
  })

  const verifiedFindings = chunkResults
    .filter((r) => r.status === 'succeeded' && r.verified)
    .map((r) => r.verified as ChunkVerifiedFindingsForReduce)

  if (verifiedFindings.length === 0) {
    throw new Error('All chunk extractions failed; cannot reduce.')
  }

  // Reduce-1: produce the entry digest from verified findings only.
  const digest = await runEntryReduce({
    model,
    entryType: params.entryType,
    participant: params.participant,
    studyGoal: params.studyGoal,
    contextNotes: params.contextNotes,
    availableTags,
    chunks: verifiedFindings,
    rawContent: normalised,
  })

  // Persist the digest back to discovery_entries.
  const writeRes = await updateEntryFromPipeline(entryId, organizationId, toEntryWriteFields(digest, hash))
  if (writeRes.error) {
    throw new Error(writeRes.error)
  }

  const aggregateStats = aggregateChunkStats(chunkResults.map((r) => ({
    verification_stats: r.verification_stats,
    status: r.status,
    prompt_version: r.prompt_version,
    model_id: r.model_id,
  } as Pick<DiscoveryChunkRow, 'verification_stats' | 'status' | 'prompt_version' | 'model_id'>)))

  return {
    digest,
    provenance: {
      chunks_total: chunkResults.length,
      chunks_succeeded: chunkResults.filter((r) => r.status === 'succeeded').length,
      chunks_failed: chunkResults.filter((r) => r.status === 'failed').length,
      quotes_returned: aggregateStats.total_quotes_returned,
      quotes_dropped: aggregateStats.total_quotes_dropped,
      prompt_version: DISCOVERY_PROMPT_VERSION,
      model_id: model.id,
    },
  }
}

// ---------------------------------------------------------------------------
// Public: per-entry analysis (transient — no DB writes)
// ---------------------------------------------------------------------------

export async function analyseEntryTransient(
  params: AnalyseEntryTransientParams,
): Promise<{ digest: EntryDigest; provenance: PipelineProvenance }> {
  const model = resolveModel(params.modelId)
  const normalised = normaliseTranscript(params.rawContent)
  const chunks = chunkTranscript(normalised)
  if (chunks.length === 0) {
    throw new Error('Cannot analyse empty content')
  }

  const results = await pMap(chunks, 5, async (chunk) => {
    try {
      const raw = await runChunkExtractionLLM({
        model,
        chunk,
        totalChunks: chunks.length,
        entryType: params.entryType,
        participant: params.participant,
        studyGoal: params.studyGoal,
        contextNotes: params.contextNotes,
        availableTags: params.availableTags,
      })
      const parsed = parseJsonStrict(raw)
      const { verified, stats } = verifyChunkFindings(chunk.text, parsed, chunk.index)
      return { ok: true as const, verified, stats }
    } catch (err) {
      return { ok: false as const, error: err instanceof Error ? err.message : String(err) }
    }
  })

  const verifiedFindings = results
    .filter((r): r is { ok: true; verified: ChunkVerifiedFindingsForReduce; stats: VerificationStats } => r.ok)
    .map((r) => r.verified)

  if (verifiedFindings.length === 0) {
    throw new Error('All chunk extractions failed; cannot reduce.')
  }

  const digest = await runEntryReduce({
    model,
    entryType: params.entryType,
    participant: params.participant,
    studyGoal: params.studyGoal,
    contextNotes: params.contextNotes,
    availableTags: params.availableTags,
    chunks: verifiedFindings,
    rawContent: normalised,
  })

  const totals = results.reduce(
    (acc, r) => {
      if (r.ok) {
        acc.returned += r.stats.total_quotes_returned
        acc.dropped += r.stats.total_quotes_dropped
      }
      return acc
    },
    { returned: 0, dropped: 0 },
  )

  return {
    digest,
    provenance: {
      chunks_total: results.length,
      chunks_succeeded: results.filter((r) => r.ok).length,
      chunks_failed: results.filter((r) => !r.ok).length,
      quotes_returned: totals.returned,
      quotes_dropped: totals.dropped,
      prompt_version: DISCOVERY_PROMPT_VERSION,
      model_id: model.id,
    },
  }
}

// ---------------------------------------------------------------------------
// Public: study synthesis (reduce-2)
// ---------------------------------------------------------------------------

export interface SynthesiseStudyParams {
  studyId: string
  organizationId: string
  userId: string | null
  studyName: string
  studyGoal: string | null
  method: string | null
  notesMarkdown: string | null
  modelId?: string
  entries: Array<{
    entry_id: string
    participant: string | null
    entry_type: string
    sentiment: string | null
    tags: string[]
    key_quote_1: string | null
    key_quote_2: string | null
    key_quote_3: string | null
    jtbd: string | null
    wtp_signal: string | null
    wtp_price_points: number[]
    problem_severity: number | null
    adoption_willingness: number | null
    analysis_markdown: string | null
    context_notes: string | null
    chunks_consulted: number
    quotes_dropped: number
  }>
}

export interface SynthesiseStudyResult {
  analysis_markdown: string
  run_id: string
  entries_included: number
  chunks_consulted: number
  quotes_dropped: number
}

export async function synthesiseStudy(
  params: SynthesiseStudyParams,
): Promise<SynthesiseStudyResult> {
  const model = resolveModel(params.modelId)

  const { run, error: runError } = await createSynthesisRun({
    study_id: params.studyId,
    organization_id: params.organizationId,
    created_by: params.userId,
    model_id: model.id,
    prompt_version: DISCOVERY_PROMPT_VERSION,
  })
  if (runError || !run) {
    throw new Error(runError ?? 'Failed to start synthesis run')
  }

  const entriesIncluded = params.entries.length
  const chunksConsulted = params.entries.reduce((sum, e) => sum + (e.chunks_consulted ?? 0), 0)
  const quotesDropped = params.entries.reduce((sum, e) => sum + (e.quotes_dropped ?? 0), 0)

  try {
    const digestEntries: StudyDigestEntry[] = params.entries.map((e) => ({
      participant: e.participant,
      entry_type: e.entry_type,
      sentiment: e.sentiment,
      tags: e.tags,
      key_quote_1: e.key_quote_1,
      key_quote_2: e.key_quote_2,
      key_quote_3: e.key_quote_3,
      jtbd: e.jtbd,
      wtp_signal: e.wtp_signal,
      wtp_price_points: e.wtp_price_points,
      problem_severity: e.problem_severity,
      adoption_willingness: e.adoption_willingness,
      analysis_markdown: e.analysis_markdown,
      context_notes: e.context_notes,
    }))

    const prompt = buildStudySynthesisPrompt({
      studyName: params.studyName,
      studyGoal: params.studyGoal,
      method: params.method,
      notesMarkdown: params.notesMarkdown,
      entries: digestEntries,
    })

    const text = await runTextLLM(model, prompt, { max_tokens: 8000 })
    const analysisMarkdown = stripCodeFences(text).trim()

    await finaliseSynthesisRun(run.id, params.organizationId, {
      status: 'succeeded',
      entries_included: entriesIncluded,
      chunks_consulted: chunksConsulted,
      quotes_dropped: quotesDropped,
      analysis_markdown: analysisMarkdown,
      error: null,
    })

    return {
      analysis_markdown: analysisMarkdown,
      run_id: run.id,
      entries_included: entriesIncluded,
      chunks_consulted: chunksConsulted,
      quotes_dropped: quotesDropped,
    }
  } catch (err) {
    await finaliseSynthesisRun(run.id, params.organizationId, {
      status: 'failed',
      entries_included: entriesIncluded,
      chunks_consulted: chunksConsulted,
      quotes_dropped: quotesDropped,
      analysis_markdown: null,
      error: err instanceof Error ? err.message : String(err),
    })
    throw err
  }
}

// ---------------------------------------------------------------------------
// Internals
// ---------------------------------------------------------------------------

interface PersistedChunkResult {
  chunk_id: string
  chunk_index: number
  status: 'succeeded' | 'failed'
  verified: ChunkVerifiedFindingsForReduce | null
  verification_stats: VerificationStats
  error: string | null
  model_id: string
  prompt_version: string
}

async function runMapStepPersisted(args: {
  chunkRows: DiscoveryChunkRow[]
  chunks: DiscoveryChunk[]
  model: AIModel
  entryType: string
  participant: string | null
  studyGoal: string | null
  contextNotes: string | null
  availableTags: string[]
  organizationId: string
}): Promise<PersistedChunkResult[]> {
  const byIndex = new Map<number, DiscoveryChunkRow>()
  args.chunkRows.forEach((row) => byIndex.set(row.chunk_index, row))

  return pMap(args.chunks, 5, async (chunk) => {
    const row = byIndex.get(chunk.index)
    if (!row) {
      return failedResult(undefined, chunk.index, 'Missing chunk row')
    }
    try {
      const raw = await runChunkExtractionLLM({
        model: args.model,
        chunk,
        totalChunks: args.chunks.length,
        entryType: args.entryType,
        participant: args.participant,
        studyGoal: args.studyGoal,
        contextNotes: args.contextNotes,
        availableTags: args.availableTags,
      })
      const parsed = parseJsonStrict(raw)
      const { verified, stats } = verifyChunkFindings(chunk.text, parsed, chunk.index)

      await updateChunkResult(row.id, args.organizationId, {
        findings_json: verified,
        verification_stats: stats,
        status: 'succeeded',
        error: null,
        model_id: args.model.id,
        prompt_version: DISCOVERY_PROMPT_VERSION,
      })
      return {
        chunk_id: row.id,
        chunk_index: chunk.index,
        status: 'succeeded' as const,
        verified,
        verification_stats: stats,
        error: null,
        model_id: args.model.id,
        prompt_version: DISCOVERY_PROMPT_VERSION,
      }
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err)
      const stats = emptyVerificationStats()
      await updateChunkResult(row.id, args.organizationId, {
        findings_json: null,
        verification_stats: stats,
        status: 'failed',
        error: errMsg,
        model_id: args.model.id,
        prompt_version: DISCOVERY_PROMPT_VERSION,
      })
      return {
        chunk_id: row.id,
        chunk_index: chunk.index,
        status: 'failed' as const,
        verified: null,
        verification_stats: stats,
        error: errMsg,
        model_id: args.model.id,
        prompt_version: DISCOVERY_PROMPT_VERSION,
      }
    }
  })
}

function failedResult(
  chunkId: string | undefined,
  chunkIndex: number,
  message: string,
): PersistedChunkResult {
  return {
    chunk_id: chunkId ?? '',
    chunk_index: chunkIndex,
    status: 'failed',
    verified: null,
    verification_stats: emptyVerificationStats(),
    error: message,
    model_id: '',
    prompt_version: DISCOVERY_PROMPT_VERSION,
  }
}

async function runChunkExtractionLLM(args: {
  model: AIModel
  chunk: DiscoveryChunk
  totalChunks: number
  entryType: string
  participant: string | null
  studyGoal: string | null
  contextNotes: string | null
  availableTags: string[]
}): Promise<string> {
  const prompt = buildChunkExtractionPrompt({
    chunkText: args.chunk.text,
    chunkIndex: args.chunk.index,
    totalChunks: args.totalChunks,
    entryType: args.entryType,
    participant: args.participant,
    studyGoal: args.studyGoal,
    contextNotes: args.contextNotes,
    availableTags: args.availableTags,
  })
  return runTextLLM(args.model, prompt, { max_tokens: 4000 })
}

async function runEntryReduce(args: {
  model: AIModel
  entryType: string
  participant: string | null
  studyGoal: string | null
  contextNotes: string | null
  availableTags: string[]
  chunks: ChunkVerifiedFindingsForReduce[]
  rawContent: string
}): Promise<EntryDigest> {
  const prompt = buildEntryDigestPrompt({
    entryType: args.entryType,
    participant: args.participant,
    studyGoal: args.studyGoal,
    contextNotes: args.contextNotes,
    availableTags: args.availableTags,
    chunks: args.chunks,
  })
  const raw = await runTextLLM(args.model, prompt, { max_tokens: 4000 })
  const parsed = parseJsonStrict(raw) as Record<string, unknown>

  // Defensive normalisation + post-LLM re-verification of any quote it included.
  const sentiment = (
    typeof parsed.sentiment === 'string' && ['positive', 'neutral', 'negative', 'mixed'].includes(parsed.sentiment)
      ? parsed.sentiment
      : 'neutral'
  ) as EntryDigest['sentiment']

  const tags = Array.isArray(parsed.tags)
    ? (parsed.tags as unknown[]).filter((t): t is string => typeof t === 'string').filter((t) => args.availableTags.includes(t))
    : []

  const wtpSignal = (
    typeof parsed.wtp_signal === 'string' && ['strong', 'moderate', 'weak', 'none'].includes(parsed.wtp_signal)
      ? parsed.wtp_signal
      : 'none'
  ) as EntryDigest['wtp_signal']

  const wtpPricePoints = Array.isArray(parsed.wtp_price_points)
    ? (parsed.wtp_price_points as unknown[]).filter((n): n is number => typeof n === 'number')
    : []

  const problemSeverity = clampInt(parsed.problem_severity, 1, 5)
  const adoptionWillingness = clampInt(parsed.adoption_willingness, 1, 5)

  const verifyAgainstAllChunks = (q: unknown): string | null => {
    if (typeof q !== 'string' || q.trim().length === 0) return null
    // Try every verified chunk's quote pool (we have the original chunk text available
    // by reconstructing from the raw_content + offsets — but we don't have chunk text
    // in this scope, so we re-verify directly against raw_content).
    const span = verifyQuote(args.rawContent, q)
    return span ? span.text : null
  }

  const keyQuote1 = verifyAgainstAllChunks(parsed.key_quote_1)
  const keyQuote2 = verifyAgainstAllChunks(parsed.key_quote_2)
  const keyQuote3 = verifyAgainstAllChunks(parsed.key_quote_3)

  const jtbd = typeof parsed.jtbd === 'string' && parsed.jtbd.trim().length > 0 ? parsed.jtbd.trim() : null

  const analysisMarkdown =
    typeof parsed.analysis_markdown === 'string' ? parsed.analysis_markdown.trim() : ''

  return {
    sentiment,
    tags,
    key_quote_1: keyQuote1,
    key_quote_2: keyQuote2,
    key_quote_3: keyQuote3,
    jtbd,
    wtp_signal: wtpSignal,
    wtp_price_points: wtpPricePoints,
    problem_severity: problemSeverity,
    adoption_willingness: adoptionWillingness,
    analysis_markdown: analysisMarkdown,
  }
}

function clampInt(value: unknown, min: number, max: number): number | null {
  if (typeof value !== 'number' || !Number.isFinite(value)) return null
  const n = Math.round(value)
  if (n < min || n > max) return null
  return n
}

function verifyChunkFindings(
  chunkText: string,
  parsed: unknown,
  chunkIndex: number,
): { verified: ChunkVerifiedFindingsForReduce; stats: VerificationStats } {
  const obj = (parsed && typeof parsed === 'object' ? parsed : {}) as Record<string, unknown>

  const arr = <T>(v: unknown): T[] => (Array.isArray(v) ? (v as T[]) : [])

  const themesIn = arr<{ label?: unknown; quote?: unknown; tags?: unknown }>(obj.themes)
    .map((t) => ({
      label: typeof t.label === 'string' ? t.label : '',
      quote: typeof t.quote === 'string' ? t.quote : '',
      tags: Array.isArray(t.tags) ? (t.tags as unknown[]).filter((s): s is string => typeof s === 'string') : [],
    }))
    .filter((t) => t.label.length > 0 && t.quote.length > 0)

  const themes = verifyQuoteList(chunkText, themesIn)

  const jtbdIn = arr<{ jtbd?: unknown; quote?: unknown }>(obj.jtbd_signals)
    .map((j) => ({
      jtbd: typeof j.jtbd === 'string' ? j.jtbd : '',
      quote: typeof j.quote === 'string' ? j.quote : '',
    }))
    .filter((j) => j.jtbd.length > 0 && j.quote.length > 0)
  const jtbdSignals = verifyQuoteList(chunkText, jtbdIn)

  const painsIn = arr<{ label?: unknown; quote?: unknown; severity_1_5?: unknown }>(obj.pains)
    .map((p) => ({
      label: typeof p.label === 'string' ? p.label : '',
      quote: typeof p.quote === 'string' ? p.quote : '',
      severity_1_5: clampInt(p.severity_1_5, 1, 5),
    }))
    .filter((p) => p.label.length > 0 && p.quote.length > 0)
  const pains = verifyQuoteList(chunkText, painsIn)

  const wtpIn = arr<{ signal?: unknown; prices?: unknown; quote?: unknown }>(obj.wtp_signals)
    .map((w) => ({
      signal: typeof w.signal === 'string' && ['strong', 'moderate', 'weak', 'none'].includes(w.signal) ? w.signal : 'none',
      prices: Array.isArray(w.prices) ? (w.prices as unknown[]).filter((n): n is number => typeof n === 'number') : [],
      quote: typeof w.quote === 'string' ? w.quote : '',
    }))
    .filter((w) => w.quote.length > 0)
  const wtpSignals = verifyQuoteList(chunkText, wtpIn)

  const objectionsIn = arr<{ quote?: unknown }>(obj.objections)
    .map((o) => ({ quote: typeof o.quote === 'string' ? o.quote : '' }))
    .filter((o) => o.quote.length > 0)
  const objections = verifyQuoteList(chunkText, objectionsIn)

  const decisionsIn = arr<{ quote?: unknown }>(obj.decisions)
    .map((d) => ({ quote: typeof d.quote === 'string' ? d.quote : '' }))
    .filter((d) => d.quote.length > 0)
  const decisions = verifyQuoteList(chunkText, decisionsIn)

  const openQuestions = arr<{ question?: unknown }>(obj.open_questions)
    .map((q) => ({ question: typeof q.question === 'string' ? q.question : '' }))
    .filter((q) => q.question.length > 0)

  const sentimentLocal =
    typeof obj.sentiment_local === 'string' && ['positive', 'neutral', 'negative', 'mixed'].includes(obj.sentiment_local)
      ? (obj.sentiment_local as string)
      : null

  const adoption = clampInt(obj.adoption_willingness_1_5, 1, 5)
  const notes = typeof obj.notes === 'string' && obj.notes.trim().length > 0 ? obj.notes.trim() : null

  const totalReturned =
    themesIn.length + jtbdIn.length + painsIn.length + wtpIn.length + objectionsIn.length + decisionsIn.length
  const totalDropped =
    themes.dropped + jtbdSignals.dropped + pains.dropped + wtpSignals.dropped + objections.dropped + decisions.dropped

  const verified: ChunkVerifiedFindingsForReduce = {
    chunk_index: chunkIndex,
    themes: themes.kept.map((k) => ({
      label: k.label,
      quote: k.verified.text,
      tags: k.tags,
    })),
    jtbd_signals: jtbdSignals.kept.map((k) => ({ jtbd: k.jtbd, quote: k.verified.text })),
    pains: pains.kept.map((k) => ({
      label: k.label,
      quote: k.verified.text,
      severity_1_5: k.severity_1_5,
    })),
    wtp_signals: wtpSignals.kept.map((k) => ({
      signal: k.signal,
      prices: k.prices,
      quote: k.verified.text,
    })),
    objections: objections.kept.map((k) => ({ quote: k.verified.text })),
    decisions: decisions.kept.map((k) => ({ quote: k.verified.text })),
    open_questions: openQuestions,
    sentiment_local: sentimentLocal,
    adoption_willingness_1_5: adoption,
    notes,
  }

  const stats: VerificationStats = {
    themes_total: themesIn.length,
    themes_dropped: themes.dropped,
    pains_total: painsIn.length,
    pains_dropped: pains.dropped,
    jtbd_total: jtbdIn.length,
    jtbd_dropped: jtbdSignals.dropped,
    wtp_total: wtpIn.length,
    wtp_dropped: wtpSignals.dropped,
    objections_total: objectionsIn.length,
    objections_dropped: objections.dropped,
    decisions_total: decisionsIn.length,
    decisions_dropped: decisions.dropped,
    total_quotes_returned: totalReturned,
    total_quotes_dropped: totalDropped,
  }

  return { verified, stats }
}

// ---------------------------------------------------------------------------
// LLM helpers
// ---------------------------------------------------------------------------

interface RunTextOptions {
  max_tokens?: number
}

async function runTextLLM(model: AIModel, prompt: string, options: RunTextOptions = {}): Promise<string> {
  if (model.provider === 'anthropic') {
    const apiKey = process.env.ANTHROPIC_API_KEY
    if (!apiKey) throw new Error('Anthropic is not configured')
    const anthropic = new Anthropic({ apiKey, maxRetries: 4 })
    const response = await anthropic.messages.create({
      model: model.id,
      max_tokens: options.max_tokens ?? 4000,
      messages: [{ role: 'user', content: prompt }],
    })
    const textBlock = response.content.find((b) => b.type === 'text')
    return textBlock?.type === 'text' ? textBlock.text : ''
  }

  if (model.provider === 'openai') {
    const apiKey = process.env.OPENAI_API_KEY
    if (!apiKey) throw new Error('OpenAI is not configured')
    const openai = new OpenAI({ apiKey })
    if (model.openaiApi === 'responses') {
      const response = await openai.responses.create({
        model: model.id,
        input: prompt,
      })
      return response.output_text ?? ''
    }
    const response = await openai.chat.completions.create({
      model: model.id,
      max_tokens: options.max_tokens ?? 4000,
      messages: [{ role: 'user', content: prompt }],
    })
    return response.choices[0]?.message?.content ?? ''
  }

  throw new Error(`Provider "${model.provider}" is not supported`)
}

function stripCodeFences(text: string): string {
  const trimmed = text.trim()
  if (trimmed.startsWith('```')) {
    return trimmed.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '').trim()
  }
  return trimmed
}

function parseJsonStrict(text: string): unknown {
  const cleaned = stripCodeFences(text)
  // Some models wrap with brief preamble; locate the outermost {...}.
  const firstBrace = cleaned.indexOf('{')
  const lastBrace = cleaned.lastIndexOf('}')
  if (firstBrace === -1 || lastBrace === -1 || lastBrace < firstBrace) {
    throw new Error('No JSON object in LLM output')
  }
  return JSON.parse(cleaned.slice(firstBrace, lastBrace + 1))
}

function resolveModel(modelId?: string): AIModel {
  if (!modelId) return DEFAULT_MODEL
  return getModelById(modelId) ?? DEFAULT_MODEL
}

async function pMap<T, R>(items: T[], concurrency: number, fn: (item: T, i: number) => Promise<R>): Promise<R[]> {
  const limit = Math.max(1, concurrency)
  const results: R[] = new Array(items.length)
  let cursor = 0
  async function worker() {
    while (true) {
      const i = cursor
      cursor += 1
      if (i >= items.length) return
      results[i] = await fn(items[i], i)
    }
  }
  const workers = Array.from({ length: Math.min(limit, items.length) }, () => worker())
  await Promise.all(workers)
  return results
}

// ---------------------------------------------------------------------------
// Aggregation helpers
// ---------------------------------------------------------------------------

function emptyVerificationStats(): VerificationStats {
  return {
    themes_total: 0,
    themes_dropped: 0,
    pains_total: 0,
    pains_dropped: 0,
    jtbd_total: 0,
    jtbd_dropped: 0,
    wtp_total: 0,
    wtp_dropped: 0,
    objections_total: 0,
    objections_dropped: 0,
    decisions_total: 0,
    decisions_dropped: 0,
    total_quotes_returned: 0,
    total_quotes_dropped: 0,
  }
}

export function aggregateChunkStats(
  chunks: Array<Pick<DiscoveryChunkRow, 'verification_stats' | 'status' | 'prompt_version' | 'model_id'>>,
): VerificationStats {
  const acc = emptyVerificationStats()
  for (const c of chunks) {
    if (!c.verification_stats) continue
    const s = c.verification_stats
    acc.themes_total += s.themes_total
    acc.themes_dropped += s.themes_dropped
    acc.pains_total += s.pains_total
    acc.pains_dropped += s.pains_dropped
    acc.jtbd_total += s.jtbd_total
    acc.jtbd_dropped += s.jtbd_dropped
    acc.wtp_total += s.wtp_total
    acc.wtp_dropped += s.wtp_dropped
    acc.objections_total += s.objections_total
    acc.objections_dropped += s.objections_dropped
    acc.decisions_total += s.decisions_total
    acc.decisions_dropped += s.decisions_dropped
    acc.total_quotes_returned += s.total_quotes_returned
    acc.total_quotes_dropped += s.total_quotes_dropped
  }
  return acc
}

function toEntryWriteFields(digest: EntryDigest, hash: string): PipelineEntryAnalysisFields {
  return {
    sentiment: digest.sentiment,
    tags: digest.tags,
    key_quote_1: digest.key_quote_1,
    key_quote_2: digest.key_quote_2,
    key_quote_3: digest.key_quote_3,
    jtbd: digest.jtbd,
    wtp_signal: digest.wtp_signal,
    wtp_price_points: digest.wtp_price_points,
    problem_severity: digest.problem_severity,
    adoption_willingness: digest.adoption_willingness,
    analysis_json: digest,
    analysis_markdown: digest.analysis_markdown,
    raw_content_hash: hash,
  }
}
