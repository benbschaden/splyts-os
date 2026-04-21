'use client'

import { useState, useEffect } from 'react'
import { ArrowLeft, Pencil, FileText, List, BarChart3, Sparkles, Loader2, PenLine, Eye, StickyNote, MessageSquare } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { cn } from '@/lib/utils'
import type { DiscoveryStudyRow, DiscoveryStudyMethod } from '@/lib/queries/discovery-studies'
import type { DiscoveryEntryRow } from '@/lib/queries/discovery-entries'
import { DiscoveryFeed } from './discovery-feed'
import { DiscoveryStudyDrawer } from './discovery-study-drawer'
import { DiscoveryStudyChat } from './discovery-study-chat'

const METHOD_LABELS: Record<DiscoveryStudyMethod, string> = {
  interview: 'Interviews',
  review: 'Reviews',
  survey: 'Surveys',
  observation: 'Observations',
  email: 'Email feedback',
  mixed: 'Mixed methods',
}

const METHOD_COLORS: Record<DiscoveryStudyMethod, string> = {
  interview: 'bg-blue-50 text-blue-700 border-blue-200',
  review: 'bg-amber-50 text-amber-700 border-amber-200',
  survey: 'bg-green-50 text-green-700 border-green-200',
  observation: 'bg-purple-50 text-purple-700 border-purple-200',
  email: 'bg-rose-50 text-rose-700 border-rose-200',
  mixed: 'bg-muted text-muted-foreground border-border',
}

type StudyTab = 'notes' | 'script' | 'entries' | 'analysis' | 'chat'

interface DiscoveryStudyDetailProps {
  study: DiscoveryStudyRow
  entries: DiscoveryEntryRow[]
  onBack: () => void
  onStudyUpdated: (study: DiscoveryStudyRow) => void
  onEntriesChanged: () => void
  onChatWithParticipant?: (participant: string) => void
}

export function DiscoveryStudyDetail({
  study,
  entries,
  onBack,
  onStudyUpdated,
  onEntriesChanged,
  onChatWithParticipant,
}: DiscoveryStudyDetailProps) {
  const [activeTab, setActiveTab] = useState<StudyTab>('entries')
  const [notes, setNotes] = useState(study.notes_markdown ?? '')
  const [script, setScript] = useState(study.script_markdown ?? '')
  const [analysis, setAnalysis] = useState(study.analysis_markdown ?? '')
  const [currentStudy, setCurrentStudy] = useState(study)
  const [savingNotes, setSavingNotes] = useState(false)
  const [notesSaved, setNotesSaved] = useState(false)
  const [savingScript, setSavingScript] = useState(false)
  const [savingAnalysis, setSavingAnalysis] = useState(false)
  const [scriptSaved, setScriptSaved] = useState(false)
  const [analysisSaved, setAnalysisSaved] = useState(false)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [statusSaving, setStatusSaving] = useState(false)
  const [synthesising, setSynthesising] = useState(false)
  const [synthesisError, setSynthesisError] = useState<string | null>(null)
  const [analysisEditing, setAnalysisEditing] = useState(false)

  useEffect(() => {
    setNotes(study.notes_markdown ?? '')
    setScript(study.script_markdown ?? '')
    setAnalysis(study.analysis_markdown ?? '')
    setCurrentStudy(study)
  }, [study.id])

  async function patchStudy(updates: Record<string, unknown>): Promise<DiscoveryStudyRow | null> {
    const res = await fetch(`/api/discovery-studies/${study.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    })
    if (!res.ok) return null
    const json = (await res.json()) as { data: DiscoveryStudyRow }
    return json.data
  }

  async function saveNotes() {
    setSavingNotes(true)
    const updated = await patchStudy({ notes_markdown: notes })
    setSavingNotes(false)
    if (updated) {
      onStudyUpdated(updated)
      setNotesSaved(true)
      setTimeout(() => setNotesSaved(false), 2000)
    }
  }

  async function saveScript() {
    setSavingScript(true)
    const updated = await patchStudy({ script_markdown: script })
    setSavingScript(false)
    if (updated) {
      onStudyUpdated(updated)
      setScriptSaved(true)
      setTimeout(() => setScriptSaved(false), 2000)
    }
  }

  async function saveAnalysis() {
    setSavingAnalysis(true)
    const updated = await patchStudy({ analysis_markdown: analysis })
    setSavingAnalysis(false)
    if (updated) {
      onStudyUpdated(updated)
      setAnalysisSaved(true)
      setTimeout(() => setAnalysisSaved(false), 2000)
    }
  }

  async function handleSynthesise() {
    setSynthesising(true)
    setSynthesisError(null)
    const res = await fetch(`/api/discovery-studies/${study.id}/synthesise`, { method: 'POST' })
    setSynthesising(false)
    if (!res.ok) {
      const json = await res.json().catch(() => ({})) as { error?: string }
      setSynthesisError(json.error ?? 'Synthesis failed. Please try again.')
      return
    }
    const json = await res.json() as { data: { analysis_markdown: string } }
    setAnalysis(json.data.analysis_markdown)
    setAnalysisEditing(false)
    onStudyUpdated({ ...study, analysis_markdown: json.data.analysis_markdown })
  }

  async function handleStatusChange(status: string) {
    setStatusSaving(true)
    const updated = await patchStudy({ status })
    setStatusSaving(false)
    if (updated) onStudyUpdated(updated)
  }

  const tabs: { id: StudyTab; label: string; Icon: typeof FileText }[] = [
    { id: 'notes', label: 'Notes', Icon: StickyNote },
    { id: 'script', label: 'Script', Icon: FileText },
    { id: 'entries', label: `Entries (${entries.length})`, Icon: List },
    { id: 'analysis', label: 'Analysis', Icon: BarChart3 },
    { id: 'chat', label: 'Chat', Icon: MessageSquare },
  ]

  return (
    <>
      <div className="space-y-4">
        {/* Breadcrumb */}
        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          All studies
        </button>

        {/* Study header */}
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-base font-semibold text-foreground">{study.name}</h2>
              {study.method && (
                <span
                  className={cn(
                    'rounded border px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider',
                    METHOD_COLORS[study.method],
                  )}
                >
                  {METHOD_LABELS[study.method]}
                </span>
              )}
            </div>
            {study.goal && (
              <p className="text-sm text-muted-foreground leading-relaxed">{study.goal}</p>
            )}
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <select
              value={study.status}
              onChange={(e) => handleStatusChange(e.target.value)}
              disabled={statusSaving}
              className="rounded-md border border-input bg-background px-2 py-1 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50"
              aria-label="Study status"
            >
              <option value="active">Active</option>
              <option value="complete">Complete</option>
              <option value="archived">Archived</option>
            </select>
            <button
              type="button"
              onClick={() => setDrawerOpen(true)}
              className="rounded-md p-1.5 text-muted-foreground hover:bg-accent transition-colors"
              title="Edit study details"
            >
              <Pencil className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        {/* Inner tab bar */}
        <nav className="flex gap-0 border-b border-border" aria-label="Study sections">
          {tabs.map(({ id, label, Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => setActiveTab(id)}
              className={cn(
                'inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium -mb-px border-b-2 transition-colors',
                activeTab === id
                  ? 'border-foreground text-foreground'
                  : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border',
              )}
              aria-selected={activeTab === id}
              role="tab"
            >
              <Icon className="h-3.5 w-3.5" />
              {label}
            </button>
          ))}
        </nav>

        {/* Notes */}
        {activeTab === 'notes' && (
          <div className="space-y-3">
            <p className="text-xs text-muted-foreground">
              Capture your research hypotheses, stakeholder context, what you are trying to decide, and any constraints. This is visible to all AI tools — Claude reads it when synthesising findings.
            </p>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={20}
              placeholder={
                '## Research goal\nWhat decision does this study need to inform?\n\n## Hypotheses\n- We believe...\n- We expect to find...\n\n## Context\nWho is involved, what prompted this study?\n\n## Constraints\nTimeline, budget, scope limits...'
              }
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground font-mono resize-y placeholder:text-muted-foreground/40 focus:outline-none focus:ring-2 focus:ring-ring"
            />
            <div className="flex justify-end">
              <button
                type="button"
                onClick={saveNotes}
                disabled={savingNotes}
                className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
              >
                {notesSaved ? 'Saved ✓' : savingNotes ? 'Saving…' : 'Save notes'}
              </button>
            </div>
          </div>
        )}

        {/* Script */}
        {activeTab === 'script' && (
          <div className="space-y-3">
            <p className="text-xs text-muted-foreground">
              Write your interview guide, survey questions, or research protocol. Use this as your
              reference during sessions.
            </p>
            <textarea
              value={script}
              onChange={(e) => setScript(e.target.value)}
              rows={20}
              placeholder={
                '# Interview guide\n\n## Warm-up (5 min)\n- Tell me about your role...\n\n## Core questions (30 min)\n- Walk me through a typical week...\n\n## Closing (5 min)\n- Is there anything else you\'d like to share?'
              }
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground font-mono resize-y placeholder:text-muted-foreground/40 focus:outline-none focus:ring-2 focus:ring-ring"
            />
            <div className="flex justify-end">
              <button
                type="button"
                onClick={saveScript}
                disabled={savingScript}
                className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
              >
                {scriptSaved ? 'Saved ✓' : savingScript ? 'Saving…' : 'Save script'}
              </button>
            </div>
          </div>
        )}

        {/* Entries */}
        {activeTab === 'entries' && (
          <DiscoveryFeed
            projectId={study.project_id}
            initialEntries={entries}
            studyId={study.id}
            onEntriesChanged={onEntriesChanged}
            onChatWithParticipant={onChatWithParticipant}
          />
        )}

        {/* Chat */}
        {activeTab === 'chat' && (
          <DiscoveryStudyChat
            study={currentStudy}
            onStudyUpdated={(updated) => {
              setCurrentStudy(updated)
              onStudyUpdated(updated)
            }}
          />
        )}

        {/* Analysis */}
        {activeTab === 'analysis' && (
          <div className="space-y-4">
            {/* AI synthesis controls */}
            <div className="rounded-lg border border-border bg-muted/20 p-4 space-y-2">
              <p className="text-xs font-medium text-foreground flex items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5 text-blue-500" />
                {analysis.trim() ? 'Re-synthesise with AI' : 'Synthesise with AI'}
              </p>
              <p className="text-[11px] text-muted-foreground">
                Claude reads all {entries.length} {entries.length === 1 ? 'entry' : 'entries'} in this study and writes a structured report covering themes, signal strength, gaps, and recommended next steps.
                {analysis.trim() ? ' This will overwrite the current analysis.' : ''}
              </p>
              {synthesisError && (
                <p className="text-xs text-destructive">{synthesisError}</p>
              )}
              <button
                type="button"
                onClick={handleSynthesise}
                disabled={synthesising || entries.length === 0}
                title={entries.length === 0 ? 'Add entries to this study first' : undefined}
                className="flex items-center gap-1.5 rounded-md bg-foreground px-4 py-1.5 text-xs font-medium text-background hover:bg-foreground/90 transition-colors disabled:opacity-50"
              >
                {synthesising ? (
                  <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Synthesising…</>
                ) : (
                  analysis.trim() ? 'Re-synthesise' : 'Synthesise'
                )}
              </button>
            </div>

            {analysis.trim() && !analysisEditing ? (
              // Rendered markdown view
              <div className="rounded-md border border-border bg-background px-5 py-5">
                <div className="prose prose-sm max-w-none text-foreground prose-headings:font-semibold prose-headings:text-foreground prose-h1:text-base prose-h1:mt-0 prose-h2:text-sm prose-h2:mt-5 prose-h3:text-sm prose-p:my-2 prose-ul:my-2 prose-ol:my-2 prose-li:my-0.5 prose-strong:font-semibold prose-strong:text-foreground prose-a:text-foreground prose-blockquote:border-border prose-blockquote:text-muted-foreground">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>{analysis}</ReactMarkdown>
                </div>
              </div>
            ) : (
              <textarea
                value={analysis}
                onChange={(e) => setAnalysis(e.target.value)}
                rows={20}
                placeholder={'# Key findings\n\n## Theme 1: ...\n\n## Theme 2: ...\n\n# Recommendations\n\n- ...'}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground font-mono resize-y placeholder:text-muted-foreground/40 focus:outline-none focus:ring-2 focus:ring-ring"
              />
            )}

            <div className="flex items-center justify-between">
              <button
                type="button"
                onClick={() => setAnalysisEditing(!analysisEditing)}
                className="flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
              >
                {analysisEditing ? (
                  <><Eye className="h-3.5 w-3.5" /> Preview</>
                ) : (
                  <><PenLine className="h-3.5 w-3.5" /> Edit</>
                )}
              </button>
              {analysisEditing && (
                <button
                  type="button"
                  onClick={saveAnalysis}
                  disabled={savingAnalysis}
                  className="rounded-md bg-primary px-4 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
                >
                  {analysisSaved ? 'Saved ✓' : savingAnalysis ? 'Saving…' : 'Save'}
                </button>
              )}
            </div>

            {/* Chat-generated report */}
            {currentStudy.report_markdown?.trim() && (
              <div className="space-y-2 pt-2 border-t border-border">
                <p className="text-xs font-medium text-foreground flex items-center gap-1.5">
                  <MessageSquare className="h-3.5 w-3.5 text-blue-500" />
                  Research report (from Chat)
                </p>
                <div className="rounded-md border border-blue-200 bg-blue-50/30 px-5 py-5">
                  <div className="prose prose-sm max-w-none text-foreground prose-headings:font-semibold prose-headings:text-foreground prose-h1:text-base prose-h1:mt-0 prose-h2:text-sm prose-h2:mt-5 prose-h3:text-sm prose-p:my-2 prose-ul:my-2 prose-ol:my-2 prose-li:my-0.5 prose-strong:font-semibold prose-strong:text-foreground prose-blockquote:border-border prose-blockquote:text-muted-foreground">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>{currentStudy.report_markdown}</ReactMarkdown>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <DiscoveryStudyDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        onSaved={onStudyUpdated}
        projectId={study.project_id}
        editing={study}
      />
    </>
  )
}
