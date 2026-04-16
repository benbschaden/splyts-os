'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Pencil, Trash2, Sparkles, MessageSquare, Star, ChevronDown, ChevronRight, Send, Loader2, BookmarkCheck, Users } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { DiscoveryEntryRow, DiscoveryEntryType, DiscoverySentiment } from '@/lib/queries/discovery-entries'
import type { DeepgramWord } from '@/lib/discovery/speaker-metrics'
import { DiscoveryDrawer } from './discovery-drawer'
import { InterviewMetricsPanel } from './interview-metrics-panel'

const DISCOVERY_TAGS = [
  'activation', 'retention', 'churn', 'pricing',
  'feature-request', 'pain-point', 'aha-moment',
  'praise', 'competitor', 'onboarding', 'referral',
]

const TYPE_LABELS: Record<DiscoveryEntryType, string> = {
  interview: 'Interview',
  review: 'Review',
  survey: 'Survey',
  observation: 'Observation',
  email: 'Email',
}

const TYPE_COLORS: Record<DiscoveryEntryType, string> = {
  interview: 'bg-blue-50 text-blue-700 border-blue-200',
  review: 'bg-amber-50 text-amber-700 border-amber-200',
  survey: 'bg-green-50 text-green-700 border-green-200',
  observation: 'bg-purple-50 text-purple-700 border-purple-200',
  email: 'bg-rose-50 text-rose-700 border-rose-200',
}

const SENTIMENT_COLORS: Record<DiscoverySentiment, string> = {
  positive: 'bg-green-500',
  neutral: 'bg-muted-foreground/40',
  negative: 'bg-red-500',
  mixed: 'bg-amber-400',
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return ''
  try {
    return new Date(dateStr).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
  } catch {
    return ''
  }
}

function truncate(text: string, max: number): string {
  if (text.length <= max) return text
  return `${text.slice(0, max).trim()}…`
}

// Find the timestamp (mm:ss) of a key quote within a diarized transcript
function findTimestamp(quote: string | null, diarizedTranscript: unknown): string | null {
  if (!quote || !diarizedTranscript) return null
  const words = diarizedTranscript as DeepgramWord[]
  if (!Array.isArray(words) || words.length === 0) return null
  const normalise = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '')
  const quoteWords = quote.split(/\s+/).map(normalise).filter(Boolean).slice(0, 4)
  if (quoteWords.length === 0) return null
  for (let i = 0; i <= words.length - quoteWords.length; i++) {
    if (quoteWords.every((qw, j) => normalise(words[i + j]?.word ?? '') === qw)) {
      const secs = Math.floor(words[i].start)
      return `${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, '0')}`
    }
  }
  return null
}

type ChatMessage = { role: 'user' | 'assistant'; content: string }

interface EntryCardProps {
  entry: DiscoveryEntryRow
  tagFilter: string
  participantFilter: string
  onTagFilter: (tag: string) => void
  onParticipantFilter: (p: string) => void
  onEdit: (e: DiscoveryEntryRow) => void
  onDelete: (id: string) => void
  deleting: boolean
}

function EntryCard({
  entry: initialEntry,
  tagFilter,
  participantFilter,
  onTagFilter,
  onParticipantFilter,
  onEdit,
  onDelete,
  deleting,
}: EntryCardProps) {
  const [entry, setEntry] = useState(initialEntry)
  const [expanded, setExpanded] = useState(false)
  const [discussOpen, setDiscussOpen] = useState(false)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [chatLoading, setChatLoading] = useState(false)
  const [savingNotes, setSavingNotes] = useState(false)
  const [notesSaved, setNotesSaved] = useState(false)
  const [togglingAi, setTogglingAi] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => { setEntry(initialEntry) }, [initialEntry])
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const quotes = [entry.key_quote_1, entry.key_quote_2, entry.key_quote_3].filter(Boolean) as string[]
  const hasExpandable = entry.jtbd || quotes.length > 0 || entry.entry_type === 'interview'

  async function sendMessage() {
    const text = input.trim()
    if (!text || chatLoading) return
    const next: ChatMessage[] = [...messages, { role: 'user', content: text }]
    setMessages(next)
    setInput('')
    setChatLoading(true)
    const res = await fetch(`/api/discovery-entries/${entry.id}/discuss`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages: next }),
    })
    setChatLoading(false)
    if (res.ok) {
      const json = await res.json() as { data: { content: string } }
      setMessages((prev) => [...prev, { role: 'assistant', content: json.data.content }])
    }
  }

  async function saveNotes() {
    if (messages.length === 0) return
    setSavingNotes(true)
    const notes = messages
      .map((m) => `**${m.role === 'user' ? 'You' : 'AI'}:** ${m.content}`)
      .join('\n\n')
    const res = await fetch(`/api/discovery-entries/${entry.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ discussion_notes: notes }),
    })
    setSavingNotes(false)
    if (res.ok) {
      setNotesSaved(true)
      setEntry((prev) => ({ ...prev, discussion_notes: notes }))
      setTimeout(() => setNotesSaved(false), 2500)
    }
  }

  async function toggleIncludeInAi() {
    setTogglingAi(true)
    const next = !entry.include_in_ai
    const res = await fetch(`/api/discovery-entries/${entry.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ include_in_ai: next }),
    })
    setTogglingAi(false)
    if (res.ok) setEntry((prev) => ({ ...prev, include_in_ai: next }))
  }

  return (
    <div className="rounded-lg border border-border bg-background transition-colors hover:bg-muted/10">
      {/* Summary row */}
      <div className="flex items-start gap-3 px-4 py-3">
        {/* Sentiment dot */}
        <div className="mt-1.5 shrink-0">
          {entry.sentiment ? (
            <span className={cn('block h-2 w-2 rounded-full', SENTIMENT_COLORS[entry.sentiment])} title={entry.sentiment} />
          ) : (
            <span className="block h-2 w-2 rounded-full bg-border" />
          )}
        </div>

        {/* Main content */}
        <div className="min-w-0 flex-1 space-y-1.5">
          <div className="flex flex-wrap items-center gap-2">
            <span className={cn('rounded border px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider', TYPE_COLORS[entry.entry_type])}>
              {TYPE_LABELS[entry.entry_type]}
            </span>
            {entry.entry_type === 'review' && entry.star_rating !== null && (
              <span className="flex items-center gap-0.5">
                {Array.from({ length: entry.star_rating }).map((_, i) => (
                  <Star key={i} className="h-3 w-3 fill-amber-400 text-amber-400" />
                ))}
              </span>
            )}
            {entry.participant && (
              <button
                type="button"
                onClick={() => onParticipantFilter(participantFilter === entry.participant ? '' : entry.participant!)}
                className={cn('rounded px-1.5 py-0.5 text-[10px] font-medium transition-colors', participantFilter === entry.participant ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground hover:bg-accent')}
              >
                {entry.participant}
              </button>
            )}
            {entry.source && <span className="text-[11px] text-muted-foreground">{entry.source}</span>}
            {entry.entry_date && <span className="text-[11px] text-muted-foreground/60">{formatDate(entry.entry_date)}</span>}
            {entry.include_in_ai && (
              <span title="Included in AI context"><Sparkles className="h-3 w-3 text-blue-500 shrink-0" aria-hidden /></span>
            )}
            {entry.persona_match_name && entry.persona_match_score !== null && (
              <span className="flex items-center gap-1 rounded border border-violet-200 bg-violet-500/10 px-1.5 py-0.5 text-[10px] font-medium text-violet-700 dark:border-violet-800 dark:text-violet-400">
                <Users className="h-2.5 w-2.5 shrink-0" />
                {entry.persona_match_name}
                <span className="opacity-60">· {entry.persona_match_score}%</span>
              </span>
            )}
          </div>

          <p className="text-xs text-foreground/80 leading-relaxed">{truncate(entry.raw_content, 160)}</p>

          {entry.tags.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {entry.tags.slice(0, 5).map((tag) => (
                <button key={tag} type="button" onClick={() => onTagFilter(tagFilter === tag ? '' : tag)}
                  className={cn('rounded px-1.5 py-0.5 text-[10px] transition-colors', tagFilter === tag ? 'bg-primary/10 text-primary font-medium' : 'bg-muted text-muted-foreground hover:bg-accent')}
                >
                  {tag}
                </button>
              ))}
              {entry.tags.length > 5 && <span className="text-[10px] text-muted-foreground/60 px-1">+{entry.tags.length - 5}</span>}
            </div>
          )}

          {/* Expand toggle */}
          {hasExpandable && (
            <button
              type="button"
              onClick={() => setExpanded((v) => !v)}
              className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground transition-colors mt-0.5"
            >
              {expanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
              {expanded ? 'Less' : 'More'}
            </button>
          )}
        </div>

        {/* Actions */}
        <div className="shrink-0 flex items-center gap-1">
          <button type="button" onClick={() => onEdit(entry)} className="rounded-md p-1.5 text-muted-foreground hover:bg-accent transition-colors" title="Edit">
            <Pencil className="h-3.5 w-3.5" />
          </button>
          <button type="button" onClick={() => onDelete(entry.id)} disabled={deleting}
            className="rounded-md p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors disabled:opacity-50" title="Delete">
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Expanded section */}
      {expanded && (
        <div className="border-t border-border px-4 py-3 space-y-4">
          {/* JTBD */}
          {entry.jtbd && (
            <div className="space-y-1">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Job to be done</p>
              <p className="text-xs text-foreground leading-relaxed">{entry.jtbd}</p>
            </div>
          )}

          {/* Key quotes */}
          {quotes.length > 0 && (
            <div className="space-y-2">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Key quotes</p>
              {quotes.map((q, i) => {
                const ts = findTimestamp(q, entry.diarized_transcript)
                return (
                  <div key={i} className="flex items-start gap-2">
                    <blockquote className="flex-1 border-l-2 border-border pl-3 text-xs text-foreground/80 italic leading-relaxed">
                      &ldquo;{q}&rdquo;
                    </blockquote>
                    {ts && (
                      <span className="shrink-0 rounded bg-muted px-1.5 py-0.5 text-[10px] font-mono text-muted-foreground">{ts}</span>
                    )}
                  </div>
                )
              })}
            </div>
          )}

          {/* Speaker metrics (interview only) */}
          {entry.entry_type === 'interview' && (
            <InterviewMetricsPanel entry={entry} />
          )}

          {/* Saved discussion notes */}
          {entry.discussion_notes && (
            <div className="space-y-1">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Saved discussion</p>
              <p className="text-xs text-muted-foreground leading-relaxed whitespace-pre-wrap">{truncate(entry.discussion_notes, 400)}</p>
            </div>
          )}

          {/* Bottom action bar */}
          <div className="flex items-center gap-3 pt-1">
            {entry.entry_type === 'interview' && (
              <button
                type="button"
                onClick={() => setDiscussOpen((v) => !v)}
                className="flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-xs font-medium text-foreground hover:bg-accent transition-colors"
              >
                <MessageSquare className="h-3.5 w-3.5" />
                {discussOpen ? 'Close chat' : 'Discuss with AI'}
              </button>
            )}

            <button
              type="button"
              onClick={toggleIncludeInAi}
              disabled={togglingAi}
              title={entry.include_in_ai ? 'Remove from AI context' : 'Include in AI context everywhere'}
              className={cn(
                'flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs font-medium transition-colors disabled:opacity-50',
                entry.include_in_ai
                  ? 'border-blue-300 bg-blue-50 text-blue-700 hover:bg-blue-100 dark:border-blue-700 dark:bg-blue-900/20 dark:text-blue-300'
                  : 'border-border text-muted-foreground hover:bg-accent'
              )}
            >
              <Sparkles className="h-3.5 w-3.5" />
              {entry.include_in_ai ? 'In AI context' : 'Add to AI context'}
            </button>
          </div>

          {/* Discuss with AI panel */}
          {discussOpen && (
            <div className="rounded-lg border border-border bg-muted/10 overflow-hidden">
              {/* Chat messages */}
              <div className="max-h-64 overflow-y-auto p-3 space-y-3">
                {messages.length === 0 && (
                  <p className="text-[11px] text-muted-foreground text-center py-4">
                    Ask anything about this interview. Claude has full access to the transcript.
                  </p>
                )}
                {messages.map((m, i) => (
                  <div key={i} className={cn('flex', m.role === 'user' ? 'justify-end' : 'justify-start')}>
                    <div className={cn(
                      'max-w-[85%] rounded-lg px-3 py-2 text-xs leading-relaxed',
                      m.role === 'user' ? 'bg-foreground text-background' : 'bg-background border border-border text-foreground'
                    )}>
                      {m.content}
                    </div>
                  </div>
                ))}
                {chatLoading && (
                  <div className="flex justify-start">
                    <div className="rounded-lg border border-border bg-background px-3 py-2">
                      <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Input */}
              <div className="border-t border-border p-2 flex gap-2">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && sendMessage()}
                  placeholder="Ask about this interview…"
                  className="flex-1 rounded-md border border-input bg-background px-3 py-1.5 text-xs text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-ring"
                />
                <button
                  type="button"
                  onClick={sendMessage}
                  disabled={!input.trim() || chatLoading}
                  className="rounded-md bg-foreground p-1.5 text-background hover:bg-foreground/90 disabled:opacity-40 transition-colors"
                >
                  <Send className="h-3.5 w-3.5" />
                </button>
              </div>

              {/* Save notes */}
              {messages.length > 0 && (
                <div className="border-t border-border px-3 py-2 flex items-center justify-between">
                  <p className="text-[11px] text-muted-foreground">Save this discussion to the interview for future reference.</p>
                  <button
                    type="button"
                    onClick={saveNotes}
                    disabled={savingNotes || notesSaved}
                    className="flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-xs font-medium text-foreground hover:bg-accent disabled:opacity-50 transition-colors"
                  >
                    <BookmarkCheck className="h-3.5 w-3.5" />
                    {notesSaved ? 'Saved ✓' : savingNotes ? 'Saving…' : 'Save notes'}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

interface DiscoveryFeedProps {
  projectId: string
  initialEntries: DiscoveryEntryRow[]
  studyId?: string
  onEntriesChanged?: () => void
  onChatWithParticipant?: (participant: string) => void
}

export function DiscoveryFeed({
  projectId,
  initialEntries,
  studyId,
  onEntriesChanged,
  onChatWithParticipant,
}: DiscoveryFeedProps) {
  const router = useRouter()
  const [entries, setEntries] = useState<DiscoveryEntryRow[]>(initialEntries)
  const [typeFilter, setTypeFilter] = useState<DiscoveryEntryType | ''>('')
  const [sentimentFilter, setSentimentFilter] = useState<DiscoverySentiment | ''>('')
  const [tagFilter, setTagFilter] = useState<string>('')
  const [participantFilter, setParticipantFilter] = useState<string>('')
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [editing, setEditing] = useState<DiscoveryEntryRow | null>(null)
  const [deleting, setDeleting] = useState<string | null>(null)

  useEffect(() => {
    setEntries(initialEntries)
  }, [initialEntries])

  const refresh = useCallback(() => {
    router.refresh()
    onEntriesChanged?.()
  }, [router, onEntriesChanged])

  const filtered = entries.filter((e) => {
    if (typeFilter && e.entry_type !== typeFilter) return false
    if (sentimentFilter && e.sentiment !== sentimentFilter) return false
    if (tagFilter && !e.tags.includes(tagFilter)) return false
    if (participantFilter && e.participant !== participantFilter) return false
    return true
  })

  const activeParticipants = Array.from(
    new Set(entries.map((e) => e.participant).filter((p): p is string => !!p))
  ).sort()

  function openNew() {
    setEditing(null)
    setDrawerOpen(true)
  }

  function openEdit(entry: DiscoveryEntryRow) {
    setEditing(entry)
    setDrawerOpen(true)
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this entry? This cannot be undone.')) return
    setDeleting(id)
    const res = await fetch(`/api/discovery-entries/${id}`, { method: 'DELETE' })
    setDeleting(null)
    if (res.ok) refresh()
  }

  const activeTags = Array.from(new Set(entries.flatMap((e) => e.tags))).sort()

  return (
    <>
      <div className="space-y-5">
        {/* Toolbar */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Type filter */}
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value as DiscoveryEntryType | '')}
            className="rounded-md border border-input bg-background px-3 py-1.5 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            aria-label="Filter by type"
          >
            <option value="">All types</option>
            {(Object.keys(TYPE_LABELS) as DiscoveryEntryType[]).map((t) => (
              <option key={t} value={t}>{TYPE_LABELS[t]}</option>
            ))}
          </select>

          {/* Sentiment filter */}
          <select
            value={sentimentFilter}
            onChange={(e) => setSentimentFilter(e.target.value as DiscoverySentiment | '')}
            className="rounded-md border border-input bg-background px-3 py-1.5 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            aria-label="Filter by sentiment"
          >
            <option value="">All sentiment</option>
            <option value="positive">Positive</option>
            <option value="neutral">Neutral</option>
            <option value="negative">Negative</option>
            <option value="mixed">Mixed</option>
          </select>

          {/* Tag filter */}
          {activeTags.length > 0 && (
            <select
              value={tagFilter}
              onChange={(e) => setTagFilter(e.target.value)}
              className="rounded-md border border-input bg-background px-3 py-1.5 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              aria-label="Filter by tag"
            >
              <option value="">All tags</option>
              {activeTags.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          )}

          {/* Participant filter */}
          {activeParticipants.length > 0 && (
            <select
              value={participantFilter}
              onChange={(e) => setParticipantFilter(e.target.value)}
              className="rounded-md border border-input bg-background px-3 py-1.5 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              aria-label="Filter by participant"
            >
              <option value="">All people</option>
              {activeParticipants.map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          )}

          <div className="flex-1" />

          {/* Chat about participant button */}
          {participantFilter && onChatWithParticipant && (
            <button
              type="button"
              onClick={() => onChatWithParticipant(participantFilter)}
              className="flex items-center gap-1.5 rounded-md border border-border bg-background px-3 py-1.5 text-xs font-medium text-foreground hover:bg-accent transition-colors"
            >
              <MessageSquare className="h-3.5 w-3.5" />
              Chat about {participantFilter}
            </button>
          )}

          <button
            type="button"
            onClick={openNew}
            className="flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            <Plus className="h-3.5 w-3.5" />
            Add entry
          </button>
        </div>

        {/* Count */}
        {(typeFilter || sentimentFilter || tagFilter) && (
          <p className="text-xs text-muted-foreground">
            {filtered.length} of {entries.length} entr{entries.length !== 1 ? 'ies' : 'y'}
          </p>
        )}

        {/* Empty state */}
        {entries.length === 0 && (
          <div className="rounded-lg border border-dashed border-border py-12 text-center">
            <p className="text-sm font-medium text-foreground mb-1">No entries yet</p>
            <p className="text-xs text-muted-foreground mb-4">
              {studyId
                ? 'Log interviews, surveys, reviews, or email feedback for this study.'
                : 'Capture interviews, reviews, surveys, and observations here.'}
            </p>
            <button
              type="button"
              onClick={openNew}
              className="text-sm font-medium text-primary hover:underline"
            >
              Add the first entry
            </button>
          </div>
        )}

        {entries.length > 0 && filtered.length === 0 && (
          <div className="rounded-lg border border-dashed border-border py-8 text-center">
            <p className="text-sm text-muted-foreground">No entries match the current filters.</p>
          </div>
        )}

        {/* Entry list */}
        {filtered.length > 0 && (
          <div className="space-y-2">
            {filtered.map((entry) => (
              <EntryCard
                key={entry.id}
                entry={entry}
                tagFilter={tagFilter}
                participantFilter={participantFilter}
                onTagFilter={setTagFilter}
                onParticipantFilter={setParticipantFilter}
                onEdit={openEdit}
                onDelete={handleDelete}
                deleting={deleting === entry.id}
              />
            ))}
          </div>
        )}
      </div>

      <DiscoveryDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        onSaved={refresh}
        editing={editing}
        projectId={projectId}
        studyId={studyId}
        availableTags={DISCOVERY_TAGS}
      />
    </>
  )
}
