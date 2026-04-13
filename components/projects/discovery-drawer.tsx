'use client'

import { useState, useEffect, useRef } from 'react'
import { X, Sparkles, ShieldOff, Star, Mic, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import type {
  DiscoveryEntryRow,
  DiscoveryEntryType,
  DiscoverySentiment,
  DiscoveryUserSegment,
  DiscoveryPlatform,
} from '@/lib/queries/discovery-entries'
import {
  computeSpeakerMetrics,
  buildPlainTranscript,
} from '@/lib/discovery/speaker-metrics'
import type { DeepgramWord, SpeakerMetrics } from '@/lib/discovery/speaker-metrics'

interface DiscoveryDrawerProps {
  open: boolean
  onClose: () => void
  onSaved: () => void
  editing: DiscoveryEntryRow | null
  projectId: string
  studyId?: string
  availableTags: string[]
}

interface FormData {
  entry_type: DiscoveryEntryType
  participant: string
  source: string
  entry_date: string
  raw_content: string
  sentiment: DiscoverySentiment | ''
  tags: string[]
  include_in_ai: boolean
  // interview
  user_segment: DiscoveryUserSegment | ''
  key_quote_1: string
  key_quote_2: string
  key_quote_3: string
  jtbd: string
  // review
  star_rating: number | null
  platform: DiscoveryPlatform | ''
}

// Raw response from the transcribe API — no metrics yet, just diarized words
type DgResponse = {
  audio_url: string
  words: DeepgramWord[]
}

// What we store after the user identifies the interviewer speaker
type TranscribeResult = {
  transcript: string
  audio_url: string
  diarized_transcript: DeepgramWord[]
  metrics: SpeakerMetrics
}

type AnalyseResult = {
  sentiment: DiscoverySentiment
  tags: string[]
  key_quote_1: string | null
  key_quote_2: string | null
  key_quote_3: string | null
  jtbd: string | null
  wtp_signal: 'strong' | 'moderate' | 'weak' | 'none'
  wtp_price_points: number[]
  problem_severity: number | null
  adoption_willingness: number | null
}

const EMPTY: FormData = {
  entry_type: 'interview',
  participant: '',
  source: '',
  entry_date: '',
  raw_content: '',
  sentiment: '',
  tags: [],
  include_in_ai: false,
  user_segment: '',
  key_quote_1: '',
  key_quote_2: '',
  key_quote_3: '',
  jtbd: '',
  star_rating: null,
  platform: '',
}

const TYPE_OPTIONS: { value: DiscoveryEntryType; label: string; desc: string }[] = [
  { value: 'interview', label: 'Interview', desc: '1:1 conversation with a user' },
  { value: 'review', label: 'Review', desc: 'Public review from App Store, G2, Reddit, etc.' },
  { value: 'survey', label: 'Survey', desc: 'Survey or NPS response' },
  { value: 'observation', label: 'Observation', desc: 'Synthesised pattern or support theme' },
  { value: 'email', label: 'Email', desc: 'Direct email or beta feedback' },
]

const SEGMENT_OPTIONS: { value: DiscoveryUserSegment; label: string }[] = [
  { value: 'prospect', label: 'Prospect' },
  { value: 'new', label: 'New user' },
  { value: 'active', label: 'Active user' },
  { value: 'power', label: 'Power user' },
  { value: 'churned', label: 'Churned' },
  { value: 'free', label: 'Free tier' },
  { value: 'paid', label: 'Paid' },
]

const PLATFORM_OPTIONS: { value: DiscoveryPlatform; label: string }[] = [
  { value: 'app_store', label: 'App Store' },
  { value: 'product_hunt', label: 'Product Hunt' },
  { value: 'g2', label: 'G2' },
  { value: 'reddit', label: 'Reddit' },
  { value: 'twitter', label: 'Twitter / X' },
  { value: 'other', label: 'Other' },
]

const RAW_CONTENT_LABELS: Record<DiscoveryEntryType, string> = {
  interview: 'Notes / transcript',
  review: 'Review text',
  survey: 'Response',
  observation: 'What you observed',
  email: 'Email content',
}

const SOURCE_PLACEHOLDERS: Record<DiscoveryEntryType, string> = {
  interview: 'e.g. User interview, Onboarding call',
  review: 'e.g. App Store, G2, Reddit',
  survey: 'e.g. NPS survey, Exit survey',
  observation: 'e.g. Support tickets, Session recordings',
  email: 'e.g. sender@email.com',
}

// Extracts the first ~15 words spoken in each turn by each speaker as a preview snippet
function getSpeakerPreviews(words: DeepgramWord[]): Record<number, string[]> {
  const previews: Record<number, string[]> = {}
  let currentSpeaker: number | null = null
  let currentTurnWords: string[] = []

  function flushTurn() {
    if (currentSpeaker === null || currentTurnWords.length === 0) return
    if (!previews[currentSpeaker]) previews[currentSpeaker] = []
    if (previews[currentSpeaker].length < 3) {
      previews[currentSpeaker].push(currentTurnWords.slice(0, 15).join(' ') + (currentTurnWords.length > 15 ? '…' : ''))
    }
    currentTurnWords = []
  }

  for (const w of words) {
    const spk = w.speaker ?? 0
    if (spk !== currentSpeaker) {
      flushTurn()
      currentSpeaker = spk
    }
    currentTurnWords.push(w.word)
  }
  flushTurn()

  return previews
}

function SpeakerPicker({
  words,
  selected,
  onSelect,
  onConfirm,
}: {
  words: DeepgramWord[]
  selected: 0 | 1
  onSelect: (n: 0 | 1) => void
  onConfirm: () => void
}) {
  const previews = getSpeakerPreviews(words)
  const speakerIds = Object.keys(previews).map(Number).sort() as (0 | 1)[]

  return (
    <div className="space-y-3">
      <p className="text-[11px] font-medium text-foreground">
        Which speaker is the interviewer? Select based on the lines below.
      </p>
      <div className="space-y-2">
        {speakerIds.map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => onSelect(n)}
            className={cn(
              'w-full rounded-lg border p-3 text-left transition-colors',
              selected === n
                ? 'border-primary bg-primary/5'
                : 'border-border bg-background hover:bg-accent/50'
            )}
          >
            <div className="flex items-center gap-2 mb-1.5">
              <div className={cn(
                'h-3.5 w-3.5 rounded-full border-2 shrink-0',
                selected === n ? 'border-primary bg-primary' : 'border-muted-foreground'
              )} />
              <span className="text-xs font-semibold text-foreground">Speaker {n + 1}</span>
            </div>
            <div className="pl-5 space-y-0.5">
              {(previews[n] ?? []).map((line, i) => (
                <p key={i} className="text-[11px] text-muted-foreground leading-snug">
                  &ldquo;{line}&rdquo;
                </p>
              ))}
            </div>
          </button>
        ))}
      </div>
      <button
        type="button"
        onClick={onConfirm}
        className="flex items-center gap-1.5 rounded-md bg-foreground px-4 py-1.5 text-xs font-medium text-background hover:bg-foreground/90 transition-colors"
      >
        Confirm — this is the interviewer
      </button>
    </div>
  )
}

export function DiscoveryDrawer({
  open,
  onClose,
  onSaved,
  editing,
  projectId,
  studyId,
  availableTags,
}: DiscoveryDrawerProps) {
  const [form, setForm] = useState<FormData>(EMPTY)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  // Audio upload state
  const [audioFile, setAudioFile] = useState<File | null>(null)
  const [transcribing, setTranscribing] = useState(false)
  const [transcribeError, setTranscribeError] = useState<string | null>(null)
  // Raw Deepgram response — populated after upload, before speaker is identified
  const [dgResponse, setDgResponse] = useState<DgResponse | null>(null)
  // Which speaker (0-indexed) is the interviewer — chosen after seeing previews
  const [interviewerSpeaker, setInterviewerSpeaker] = useState<0 | 1>(0)
  // Final computed result — populated after speaker is confirmed
  const [transcribeResult, setTranscribeResult] = useState<TranscribeResult | null>(null)
  // AI analysis state
  const [analysing, setAnalysing] = useState(false)
  const [analyseError, setAnalyseError] = useState<string | null>(null)
  const [pendingSignals, setPendingSignals] = useState<AnalyseResult | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (open) {
      if (editing) {
        setForm({
          entry_type: editing.entry_type,
          participant: editing.participant ?? '',
          source: editing.source ?? '',
          entry_date: editing.entry_date ?? '',
          raw_content: editing.raw_content,
          sentiment: editing.sentiment ?? '',
          tags: editing.tags ?? [],
          include_in_ai: editing.include_in_ai,
          user_segment: editing.user_segment ?? '',
          key_quote_1: editing.key_quote_1 ?? '',
          key_quote_2: editing.key_quote_2 ?? '',
          key_quote_3: editing.key_quote_3 ?? '',
          jtbd: editing.jtbd ?? '',
          star_rating: editing.star_rating ?? null,
          platform: editing.platform ?? '',
        })
      } else {
        setForm(EMPTY)
      }
      setError(null)
      setAudioFile(null)
      setDgResponse(null)
      setInterviewerSpeaker(0)
      setTranscribeResult(null)
      setTranscribeError(null)
      setAnalyseError(null)
    }
  }, [open, editing])

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    if (open) document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [open, onClose])

  function set<K extends keyof FormData>(key: K, value: FormData[K]) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  function toggleTag(tag: string) {
    setForm((prev) => ({
      ...prev,
      tags: prev.tags.includes(tag)
        ? prev.tags.filter((t) => t !== tag)
        : [...prev.tags, tag],
    }))
  }

  async function handleTranscribe() {
    if (!audioFile) return
    setTranscribing(true)
    setTranscribeError(null)
    setDgResponse(null)
    setTranscribeResult(null)

    const fd = new FormData()
    fd.append('file', audioFile)

    const res = await fetch('/api/discovery-entries/transcribe', { method: 'POST', body: fd })
    setTranscribing(false)

    if (!res.ok) {
      const json = await res.json().catch(() => ({})) as { error?: string }
      setTranscribeError(json.error ?? 'Transcription failed. Please try again.')
      return
    }

    const json = await res.json() as { data: DgResponse }
    setDgResponse(json.data)
    setInterviewerSpeaker(0)
    // Don't populate raw_content yet — wait for the user to confirm the interviewer
  }

  function handleConfirmSpeaker() {
    if (!dgResponse) return
    const transcript = buildPlainTranscript(dgResponse.words, interviewerSpeaker)
    const metrics = computeSpeakerMetrics(dgResponse.words, interviewerSpeaker)
    const result: TranscribeResult = {
      transcript,
      audio_url: dgResponse.audio_url,
      diarized_transcript: dgResponse.words,
      metrics,
    }
    setTranscribeResult(result)
    set('raw_content', transcript)
  }

  async function handleAnalyse() {
    if (!form.raw_content.trim()) return
    setAnalysing(true)
    setAnalyseError(null)

    const res = await fetch('/api/discovery-entries/analyse', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        raw_content: form.raw_content,
        entry_type: form.entry_type,
        available_tags: availableTags,
      }),
    })
    setAnalysing(false)

    if (!res.ok) {
      const json = await res.json().catch(() => ({})) as { error?: string }
      setAnalyseError(json.error ?? 'Analysis failed. Please try again.')
      return
    }

    const json = await res.json() as { data: AnalyseResult }
    const a = json.data
    setForm((prev) => ({
      ...prev,
      sentiment: a.sentiment,
      tags: a.tags,
      key_quote_1: a.key_quote_1 ?? '',
      key_quote_2: a.key_quote_2 ?? '',
      key_quote_3: a.key_quote_3 ?? '',
      jtbd: a.jtbd ?? '',
    }))
    // Store extended fields for save
    setPendingSignals(a)
  }

  async function handleSave() {
    if (!form.raw_content.trim()) {
      setError('Content is required.')
      return
    }
    setSaving(true)
    setError(null)

    const body = {
      project_id: projectId,
      entry_type: form.entry_type,
      participant: form.participant.trim() || null,
      source: form.source.trim() || null,
      entry_date: form.entry_date || null,
      raw_content: form.raw_content.trim(),
      sentiment: form.sentiment || null,
      tags: form.tags,
      include_in_ai: form.include_in_ai,
      // interview
      user_segment: form.entry_type === 'interview' ? (form.user_segment || null) : null,
      key_quote_1: form.entry_type === 'interview' ? (form.key_quote_1.trim() || null) : null,
      key_quote_2: form.entry_type === 'interview' ? (form.key_quote_2.trim() || null) : null,
      key_quote_3: form.entry_type === 'interview' ? (form.key_quote_3.trim() || null) : null,
      jtbd: form.entry_type === 'interview' ? (form.jtbd.trim() || null) : null,
      // review
      star_rating: form.entry_type === 'review' ? form.star_rating : null,
      platform: form.entry_type === 'review' ? (form.platform || null) : null,
      source_material_id: null,
      study_id: studyId ?? null,
      // audio + transcription
      audio_url: transcribeResult?.audio_url ?? null,
      diarized_transcript: transcribeResult?.diarized_transcript ?? null,
      ...(transcribeResult?.metrics ?? {}),
      // AI content signals
      wtp_signal: pendingSignals?.wtp_signal ?? null,
      wtp_price_points: pendingSignals?.wtp_price_points ?? null,
      problem_severity: pendingSignals?.problem_severity ?? null,
      adoption_willingness: pendingSignals?.adoption_willingness ?? null,
    }

    const url = editing ? `/api/discovery-entries/${editing.id}` : '/api/discovery-entries'
    const method = editing ? 'PATCH' : 'POST'

    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })

    setSaving(false)

    if (!res.ok) {
      setError('Failed to save. Please try again.')
      return
    }

    onSaved()
    onClose()
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} aria-hidden />
      <div className="relative ml-auto flex h-full w-full max-w-[520px] flex-col bg-background shadow-2xl">
        {/* Header */}
        <div className="flex shrink-0 items-center justify-between border-b border-border px-6 py-5">
          <h2 className="text-sm font-semibold text-foreground">
            {editing ? 'Edit entry' : 'New discovery entry'}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1.5 text-muted-foreground hover:bg-accent transition-colors"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-6 space-y-5">
          {error && (
            <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>
          )}

          {/* Entry type */}
          <div className="space-y-2">
            <p className="text-xs font-medium text-foreground">Type</p>
            <div className="grid grid-cols-2 gap-2">
              {TYPE_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => set('entry_type', opt.value)}
                  className={cn(
                    'rounded-lg border p-3 text-left transition-colors',
                    form.entry_type === opt.value
                      ? 'border-foreground/30 bg-accent'
                      : 'border-border hover:bg-muted/40',
                  )}
                >
                  <p className="text-xs font-semibold text-foreground">{opt.label}</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">{opt.desc}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Participant */}
          <div className="space-y-1.5">
            <label htmlFor="entry-participant" className="text-xs font-medium text-foreground">
              Participant <span className="text-muted-foreground font-normal">(optional)</span>
            </label>
            <input
              id="entry-participant"
              type="text"
              value={form.participant}
              onChange={(e) => set('participant', e.target.value)}
              placeholder="e.g. James H., user@email.com"
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-ring"
            />
            <p className="text-[11px] text-muted-foreground">
              Tag a person to group all their entries and chat with AI about them.
            </p>
          </div>

          {/* Source + Date row */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label htmlFor="entry-source" className="text-xs font-medium text-foreground">
                Source
              </label>
              <input
                id="entry-source"
                type="text"
                value={form.source}
                onChange={(e) => set('source', e.target.value)}
                placeholder={SOURCE_PLACEHOLDERS[form.entry_type]}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="entry-date" className="text-xs font-medium text-foreground">
                Date
              </label>
              <input
                id="entry-date"
                type="date"
                value={form.entry_date}
                onChange={(e) => set('entry_date', e.target.value)}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
          </div>

          {/* Audio upload (interview only) */}
          {form.entry_type === 'interview' && (
            <div className="space-y-3 rounded-lg border border-border bg-muted/20 p-4">
              <p className="text-xs font-medium text-foreground flex items-center gap-1.5">
                <Mic className="h-3.5 w-3.5 text-muted-foreground" />
                Upload interview audio
              </p>
              <p className="text-[11px] text-muted-foreground -mt-1">
                Upload an audio file to auto-transcribe and compute speaker metrics. Or paste a transcript below.
              </p>

              <input
                ref={fileInputRef}
                type="file"
                accept="audio/mpeg,audio/mp4,audio/m4a,audio/x-m4a,audio/wav,audio/webm,video/webm"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0] ?? null
                  setAudioFile(f)
                  setDgResponse(null)
                  setTranscribeResult(null)
                  setTranscribeError(null)
                }}
              />

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="rounded-md border border-border bg-background px-3 py-1.5 text-xs font-medium text-foreground hover:bg-accent transition-colors"
                >
                  {audioFile ? audioFile.name : 'Choose file'}
                </button>
                {audioFile && (
                  <span className="text-[11px] text-muted-foreground">
                    {(audioFile.size / 1024 / 1024).toFixed(1)} MB
                  </span>
                )}
              </div>

              {audioFile && !dgResponse && (
                <button
                  type="button"
                  onClick={handleTranscribe}
                  disabled={transcribing}
                  className="flex items-center gap-1.5 rounded-md bg-foreground px-4 py-1.5 text-xs font-medium text-background hover:bg-foreground/90 transition-colors disabled:opacity-50"
                >
                  {transcribing ? (
                    <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Transcribing…</>
                  ) : (
                    'Transcribe'
                  )}
                </button>
              )}

              {transcribeError && (
                <p className="text-xs text-destructive">{transcribeError}</p>
              )}

              {/* Step 2: speaker identification — shown after Deepgram returns */}
              {dgResponse && !transcribeResult && (
                <SpeakerPicker
                  words={dgResponse.words}
                  selected={interviewerSpeaker}
                  onSelect={setInterviewerSpeaker}
                  onConfirm={handleConfirmSpeaker}
                />
              )}

              {transcribeResult && (
                <p className="text-[11px] text-green-700 dark:text-green-400 font-medium">
                  ✓ Transcribed — speaker metrics computed. Review the transcript below.
                </p>
              )}
            </div>
          )}

          {/* Raw content */}
          <div className="space-y-1.5">
            <label htmlFor="entry-content" className="text-xs font-medium text-foreground">
              {RAW_CONTENT_LABELS[form.entry_type]} <span className="text-destructive">*</span>
            </label>
            {form.entry_type === 'interview' && (
              <p className="text-[11px] text-muted-foreground -mt-0.5">
                Paste the full transcript or your notes. No length limit.
              </p>
            )}
            <textarea
              id="entry-content"
              value={form.raw_content}
              onChange={(e) => set('raw_content', e.target.value)}
              rows={form.entry_type === 'interview' ? 8 : 5}
              placeholder={
                form.entry_type === 'interview'
                  ? 'Paste transcript or write notes here…'
                  : form.entry_type === 'review'
                  ? 'The full review text…'
                  : form.entry_type === 'survey'
                  ? 'The survey response…'
                  : form.entry_type === 'email'
                  ? 'Paste the email content here…'
                  : 'Describe the pattern or theme you observed…'
              }
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground resize-none placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          {/* Analyse with AI */}
          {form.raw_content.trim().length > 0 && (
            <div className="rounded-lg border border-border bg-muted/20 p-4 space-y-2">
              <p className="text-xs font-medium text-foreground flex items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5 text-blue-500" />
                Analyse with AI
              </p>
              <p className="text-[11px] text-muted-foreground">
                Claude will extract sentiment, tags, key quotes, JTBD, WTP signal, problem severity, and adoption willingness — without bias.
              </p>
              {analyseError && (
                <p className="text-xs text-destructive">{analyseError}</p>
              )}
              <button
                type="button"
                onClick={handleAnalyse}
                disabled={analysing}
                className="flex items-center gap-1.5 rounded-md bg-blue-600 px-4 py-1.5 text-xs font-medium text-white hover:bg-blue-700 transition-colors disabled:opacity-50"
              >
                {analysing ? (
                  <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Analysing…</>
                ) : (
                  'Analyse with AI'
                )}
              </button>
            </div>
          )}

          {/* Sentiment */}
          <div className="space-y-1.5">
            <p className="text-xs font-medium text-foreground">Sentiment</p>
            <div className="flex gap-2">
              {(['positive', 'neutral', 'negative', 'mixed'] as const).map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => set('sentiment', form.sentiment === s ? '' : s)}
                  className={cn(
                    'rounded-md px-3 py-1.5 text-xs font-medium transition-colors capitalize',
                    form.sentiment === s
                      ? s === 'positive' ? 'bg-green-100 text-green-800 border border-green-300'
                        : s === 'negative' ? 'bg-red-100 text-red-800 border border-red-300'
                        : s === 'mixed' ? 'bg-amber-100 text-amber-800 border border-amber-300'
                        : 'bg-muted text-foreground border border-border'
                      : 'border border-border text-muted-foreground hover:bg-muted/50',
                  )}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          {/* Tags */}
          <div className="space-y-1.5">
            <p className="text-xs font-medium text-foreground">Tags</p>
            <div className="flex flex-wrap gap-1.5">
              {availableTags.map((tag) => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => toggleTag(tag)}
                  className={cn(
                    'rounded-md px-2.5 py-1 text-xs transition-colors',
                    form.tags.includes(tag)
                      ? 'bg-primary text-primary-foreground'
                      : 'border border-border text-muted-foreground hover:bg-muted/50',
                  )}
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>

          {/* Interview-specific fields */}
          {form.entry_type === 'interview' && (
            <>
              <div className="space-y-1.5">
                <label htmlFor="entry-segment" className="text-xs font-medium text-foreground">
                  User segment
                </label>
                <select
                  id="entry-segment"
                  value={form.user_segment}
                  onChange={(e) => set('user_segment', e.target.value as DiscoveryUserSegment | '')}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  <option value="">Not specified</option>
                  {SEGMENT_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-3">
                <p className="text-xs font-medium text-foreground">Key quotes</p>
                <p className="text-[11px] text-muted-foreground -mt-2">
                  Pull out up to 3 standout lines from the conversation.
                </p>
                {(['key_quote_1', 'key_quote_2', 'key_quote_3'] as const).map((field, i) => (
                  <input
                    key={field}
                    type="text"
                    value={form[field]}
                    onChange={(e) => set(field, e.target.value)}
                    placeholder={`Quote ${i + 1}…`}
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                ))}
              </div>

              <div className="space-y-1.5">
                <label htmlFor="entry-jtbd" className="text-xs font-medium text-foreground">
                  Jobs to be done
                </label>
                <p className="text-[11px] text-muted-foreground -mt-0.5">
                  One-liner: &ldquo;Help me ___ so I can ___&rdquo;
                </p>
                <input
                  id="entry-jtbd"
                  type="text"
                  value={form.jtbd}
                  onChange={(e) => set('jtbd', e.target.value)}
                  placeholder="Help me track my training so I can improve faster"
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
            </>
          )}

          {/* Review-specific fields */}
          {form.entry_type === 'review' && (
            <>
              <div className="space-y-1.5">
                <p className="text-xs font-medium text-foreground">Star rating</p>
                <div className="flex items-center gap-1">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <button
                      key={n}
                      type="button"
                      onClick={() => set('star_rating', form.star_rating === n ? null : n)}
                      className="transition-transform hover:scale-110"
                      aria-label={`${n} star${n !== 1 ? 's' : ''}`}
                    >
                      <Star
                        className={cn(
                          'h-5 w-5 transition-colors',
                          form.star_rating !== null && n <= form.star_rating
                            ? 'fill-amber-400 text-amber-400'
                            : 'text-border hover:text-amber-300',
                        )}
                      />
                    </button>
                  ))}
                  {form.star_rating !== null && (
                    <span className="ml-1 text-xs text-muted-foreground">{form.star_rating}/5</span>
                  )}
                </div>
              </div>

              <div className="space-y-1.5">
                <label htmlFor="entry-platform" className="text-xs font-medium text-foreground">
                  Platform
                </label>
                <select
                  id="entry-platform"
                  value={form.platform}
                  onChange={(e) => set('platform', e.target.value as DiscoveryPlatform | '')}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  <option value="">Not specified</option>
                  {PLATFORM_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>
            </>
          )}

          {/* AI context toggle */}
          <section>
            <p className="mb-3 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
              AI context
            </p>
            <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-border p-4 hover:bg-muted/30 transition-colors">
              <button
                type="button"
                role="switch"
                aria-checked={form.include_in_ai}
                onClick={() => set('include_in_ai', !form.include_in_ai)}
                className={cn(
                  'relative mt-0.5 inline-flex h-5 w-9 shrink-0 rounded-full border-2 border-transparent transition-colors',
                  form.include_in_ai ? 'bg-blue-500' : 'bg-muted',
                )}
              >
                <span
                  className={cn(
                    'pointer-events-none inline-block h-4 w-4 rounded-full bg-white shadow-sm transition-transform',
                    form.include_in_ai ? 'translate-x-4' : 'translate-x-0',
                  )}
                />
              </button>
              <div>
                <p className="text-sm font-medium text-foreground flex items-center gap-1.5">
                  {form.include_in_ai ? (
                    <><Sparkles className="h-3.5 w-3.5 text-blue-500" /> Include in AI</>
                  ) : (
                    <><ShieldOff className="h-3.5 w-3.5 text-muted-foreground" /> Hidden from AI</>
                  )}
                </p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {form.include_in_ai
                    ? 'This entry is available in the project assistant and generation context.'
                    : 'Kept for reference only; not sent to AI.'}
                </p>
              </div>
            </label>
          </section>
        </div>

        {/* Footer */}
        <div className="shrink-0 flex items-center justify-end gap-3 border-t border-border px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="rounded-md px-4 py-2 text-sm font-medium text-muted-foreground hover:bg-accent transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="rounded-md bg-primary px-5 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
          >
            {saving ? 'Saving…' : editing ? 'Save changes' : 'Create entry'}
          </button>
        </div>
      </div>
    </div>
  )
}
