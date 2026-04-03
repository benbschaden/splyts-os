'use client'

import { useState, useRef } from 'react'
import { Upload, FileText, Trash2, CheckCircle, X, Loader2, User, AlertCircle, MessageSquare } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { CohortDocumentRow, CohortDocumentSegment } from '@/lib/queries/cohort-documents'
import type { CustomerInsightRow, InsightCategory, InsightImpact } from '@/lib/queries/customer-insights'
import { HubChatPanel } from './hub-chat-panel'

interface DraftInsight {
  content: string
  category: InsightCategory
  impact: InsightImpact
  source_contact_id?: string | null
}

interface RespondentDraft {
  email: string | null
  name: string | null
  contact_id: string | null
  contact_name: string | null
  insights: DraftInsight[]
}

type ExtractionMode = 'thematic' | 'per_respondent'

interface UploadState {
  segment: CohortDocumentSegment
  status: 'uploading' | 'extracting' | 'reviewing' | 'saving' | 'done' | 'error'
  error?: string
  documentId?: string
  mode: ExtractionMode
  drafts: DraftInsight[]
  respondents: RespondentDraft[]
  savedCount?: number
}

interface ContactOption {
  id: string
  name: string
}

interface CohortsViewProps {
  projectId: string
  initialDocuments: CohortDocumentRow[]
  contacts?: ContactOption[]
  onInsightsAdded: (insights: CustomerInsightRow[]) => void
}

const SEGMENT_META: Record<CohortDocumentSegment, { label: string; description: string; dot: string }> = {
  beta_user: { label: 'Beta Users', description: 'Early adopters testing the product', dot: 'bg-blue-500' },
  free_user: { label: 'Free Users', description: 'Active on the free tier', dot: 'bg-sky-500' },
  customer: { label: 'Paying Customers', description: 'Active paid subscribers', dot: 'bg-green-500' },
  power_user: { label: 'Power Users', description: 'Highly engaged, frequent users', dot: 'bg-violet-500' },
  prospect: { label: 'Prospects', description: 'Potential customers in evaluation', dot: 'bg-amber-500' },
  churned: { label: 'Churned Users', description: 'Former customers who left', dot: 'bg-red-500' },
  other: { label: 'Other', description: 'Uncategorized segment', dot: 'bg-muted-foreground/40' },
}

const SEGMENT_ORDER: CohortDocumentSegment[] = [
  'beta_user', 'free_user', 'customer', 'power_user', 'prospect', 'churned', 'other',
]

const CATEGORY_LABELS: Record<InsightCategory, string> = {
  pain_point: 'Pain Point',
  feature_request: 'Feature Request',
  praise: 'Praise',
  objection: 'Objection',
  churn_signal: 'Churn Signal',
  usage_pattern: 'Usage Pattern',
  market_insight: 'Market Insight',
}

const IMPACT_BADGE: Record<InsightImpact, string> = {
  high: 'bg-red-500/10 text-red-700 border-red-200 dark:text-red-400 dark:border-red-800',
  medium: 'bg-amber-500/10 text-amber-700 border-amber-200 dark:text-amber-400 dark:border-amber-800',
  low: 'bg-green-500/10 text-green-700 border-green-200 dark:text-green-400 dark:border-green-800',
}

const ACCEPTED_TYPES = '.csv,.xlsx,.pdf,.docx,.txt,.md,.json'

type SegmentTab = 'chat' | 'documents'

function totalInsightCount(state: UploadState): number {
  if (state.mode === 'per_respondent') return state.respondents.reduce((sum, r) => sum + r.insights.length, 0)
  return state.drafts.length
}

export function CohortsView({ projectId, initialDocuments, contacts = [], onInsightsAdded }: CohortsViewProps) {
  const [documents, setDocuments] = useState<CohortDocumentRow[]>(initialDocuments)
  const [selectedSegment, setSelectedSegment] = useState<CohortDocumentSegment>('beta_user')
  const [segmentTab, setSegmentTab] = useState<SegmentTab>('chat')
  const [uploadState, setUploadState] = useState<UploadState | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  function docsBySegment(seg: CohortDocumentSegment) {
    return documents.filter((d) => d.segment === seg)
  }

  function handleUploadClick() {
    fileInputRef.current?.click()
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return

    setUploadState({ segment: selectedSegment, status: 'uploading', mode: 'thematic', drafts: [], respondents: [] })

    const formData = new FormData()
    formData.append('file', file)
    formData.append('segment', selectedSegment)
    formData.append('projectId', projectId)

    try {
      setUploadState((prev) => prev ? { ...prev, status: 'extracting' } : prev)

      const res = await fetch('/api/cohort-documents/upload', { method: 'POST', body: formData })

      if (!res.ok) {
        const data = await res.json()
        setUploadState((prev) => prev ? { ...prev, status: 'error', error: data.error ?? 'Upload failed.' } : prev)
        return
      }

      const data = await res.json()
      const newDoc: CohortDocumentRow = data.document
      const mode: ExtractionMode = data.mode ?? 'thematic'

      setDocuments((prev) => [newDoc, ...prev])

      if (mode === 'per_respondent') {
        const respondents: RespondentDraft[] = (data.respondents ?? []).map(
          (r: RespondentDraft & { contact_id?: string | null; contact_name?: string | null }) => ({
            email: r.email ?? null,
            name: r.name ?? null,
            contact_id: r.contact_id ?? null,
            contact_name: r.contact_name ?? null,
            insights: r.insights ?? [],
          }),
        )

        if (respondents.length === 0 || respondents.every((r) => r.insights.length === 0)) {
          setUploadState((prev) => prev ? { ...prev, status: 'error', error: 'No insights could be extracted.', documentId: newDoc.id } : prev)
          return
        }

        setUploadState({ segment: selectedSegment, status: 'reviewing', documentId: newDoc.id, mode: 'per_respondent', drafts: [], respondents })
        return
      }

      const drafts: DraftInsight[] = data.drafts ?? []
      if (drafts.length === 0) {
        setUploadState((prev) => prev ? { ...prev, status: 'error', error: 'File uploaded but no insights could be extracted.', documentId: newDoc.id } : prev)
        return
      }

      setUploadState({ segment: selectedSegment, status: 'reviewing', documentId: newDoc.id, mode: 'thematic', drafts, respondents: [] })
    } catch {
      setUploadState((prev) => prev ? { ...prev, status: 'error', error: 'Something went wrong.' } : prev)
    }
  }

  function updateDraft(index: number, field: keyof DraftInsight, value: string | null) {
    setUploadState((prev) => {
      if (!prev) return prev
      const drafts = [...prev.drafts]
      drafts[index] = { ...drafts[index], [field]: value }
      return { ...prev, drafts }
    })
  }

  function removeDraft(index: number) {
    setUploadState((prev) => {
      if (!prev) return prev
      return { ...prev, drafts: prev.drafts.filter((_, i) => i !== index) }
    })
  }

  function updateRespondentContact(rIdx: number, contactId: string | null) {
    setUploadState((prev) => {
      if (!prev) return prev
      const respondents = [...prev.respondents]
      const contact = contacts.find((c) => c.id === contactId) ?? null
      respondents[rIdx] = { ...respondents[rIdx], contact_id: contactId, contact_name: contact?.name ?? null }
      return { ...prev, respondents }
    })
  }

  function updateRespondentInsight(rIdx: number, iIdx: number, field: keyof DraftInsight, value: string | null) {
    setUploadState((prev) => {
      if (!prev) return prev
      const respondents = [...prev.respondents]
      const insights = [...respondents[rIdx].insights]
      insights[iIdx] = { ...insights[iIdx], [field]: value }
      respondents[rIdx] = { ...respondents[rIdx], insights }
      return { ...prev, respondents }
    })
  }

  function removeRespondentInsight(rIdx: number, iIdx: number) {
    setUploadState((prev) => {
      if (!prev) return prev
      const respondents = [...prev.respondents]
      respondents[rIdx] = { ...respondents[rIdx], insights: respondents[rIdx].insights.filter((_, i) => i !== iIdx) }
      return { ...prev, respondents }
    })
  }

  async function handleConfirm() {
    if (!uploadState || !uploadState.documentId) return
    const count = totalInsightCount(uploadState)
    if (count === 0) return

    setUploadState((prev) => prev ? { ...prev, status: 'saving' } : prev)

    const insights: DraftInsight[] = uploadState.mode === 'per_respondent'
      ? uploadState.respondents.flatMap((r) => r.insights.map((ins) => ({ ...ins, source_contact_id: r.contact_id ?? null })))
      : uploadState.drafts

    try {
      const res = await fetch(`/api/cohort-documents/${uploadState.documentId}/confirm`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ insights }),
      })

      if (!res.ok) {
        setUploadState((prev) => prev ? { ...prev, status: 'error', error: 'Failed to save insights.' } : prev)
        return
      }

      const data = await res.json()
      const saved: CustomerInsightRow[] = data.insights ?? []

      setDocuments((prev) =>
        prev.map((d) =>
          d.id === uploadState.documentId ? { ...d, insights_extracted: saved.length, status: 'processed' } : d,
        ),
      )

      onInsightsAdded(saved)
      setUploadState((prev) => prev ? { ...prev, status: 'done', savedCount: saved.length } : prev)
    } catch {
      setUploadState((prev) => prev ? { ...prev, status: 'error', error: 'Failed to save insights.' } : prev)
    }
  }

  async function handleDeleteDocument(doc: CohortDocumentRow) {
    if (!confirm(`Delete "${doc.file_name}"?`)) return
    setDeletingId(doc.id)
    await fetch(`/api/cohort-documents/${doc.id}`, { method: 'DELETE' })
    setDeletingId(null)
    setDocuments((prev) => prev.filter((d) => d.id !== doc.id))
  }

  const segDocs = docsBySegment(selectedSegment)
  const meta = SEGMENT_META[selectedSegment]

  return (
    <div className="flex h-full overflow-hidden">
      <input ref={fileInputRef} type="file" accept={ACCEPTED_TYPES} className="hidden" onChange={handleFileChange} aria-hidden="true" />

      {/* Left: segment list */}
      <div className="w-56 shrink-0 border-r border-border overflow-y-auto">
        {SEGMENT_ORDER.map((seg) => {
          const m = SEGMENT_META[seg]
          const docs = docsBySegment(seg)
          const totalInsights = docs.reduce((sum, d) => sum + d.insights_extracted, 0)
          const isSelected = selectedSegment === seg

          return (
            <button
              key={seg}
              type="button"
              onClick={() => { setSelectedSegment(seg); setUploadState(null) }}
              className={cn(
                'w-full text-left px-4 py-3 border-b border-border/60 transition-colors',
                isSelected ? 'bg-accent' : 'hover:bg-accent/50',
              )}
            >
              <div className="flex items-center gap-2.5">
                <span className={cn('h-2 w-2 rounded-full shrink-0', m.dot)} />
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{m.label}</p>
                  <div className="flex gap-2 mt-0.5">
                    {docs.length > 0 && (
                      <span className="text-[10px] text-muted-foreground">{docs.length} doc{docs.length !== 1 ? 's' : ''}</span>
                    )}
                    {totalInsights > 0 && (
                      <span className="text-[10px] text-muted-foreground">{totalInsights} insight{totalInsights !== 1 ? 's' : ''}</span>
                    )}
                    {docs.length === 0 && totalInsights === 0 && (
                      <span className="text-[10px] text-muted-foreground/50">empty</span>
                    )}
                  </div>
                </div>
              </div>
            </button>
          )
        })}
      </div>

      {/* Right: segment detail */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Header */}
        <div className="shrink-0 flex items-center justify-between px-5 py-3 border-b border-border">
          <div>
            <h2 className="text-sm font-semibold text-foreground">{meta.label}</h2>
            <p className="text-[11px] text-muted-foreground">{meta.description}</p>
          </div>
          {segmentTab === 'documents' && (
            <button
              type="button"
              onClick={handleUploadClick}
              className="flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              <Upload className="h-3.5 w-3.5" />
              Upload
            </button>
          )}
        </div>

        {/* Tab bar */}
        <div className="shrink-0 flex border-b border-border px-5">
          {([
            { id: 'chat' as SegmentTab, label: 'Chat', icon: MessageSquare },
            { id: 'documents' as SegmentTab, label: `Documents${segDocs.length > 0 ? ` (${segDocs.length})` : ''}` },
          ]).map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setSegmentTab(tab.id)}
              className={cn(
                'px-1 py-2.5 mr-5 text-xs font-medium border-b-2 transition-colors',
                segmentTab === tab.id
                  ? 'border-primary text-foreground'
                  : 'border-transparent text-muted-foreground hover:text-foreground',
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div className={cn('flex-1 min-h-0', segmentTab === 'chat' ? 'overflow-hidden' : 'overflow-y-auto')}>
          {segmentTab === 'chat' && (
            <HubChatPanel
              key={selectedSegment}
              segment={selectedSegment}
              placeholder={`Ask about ${meta.label} — blockers, patterns, churn signals, what to prioritise next…`}
              onInsightsExtracted={(saved) => onInsightsAdded(saved)}
            />
          )}

          {segmentTab === 'documents' && (
            <div className="flex flex-col gap-3 p-5">
              {/* Upload review panel */}
              {uploadState && uploadState.segment === selectedSegment && (
                <div className="rounded-xl border border-border bg-background shadow-sm">
                  <div className="flex items-center justify-between px-5 py-3 border-b border-border">
                    <div className="flex items-center gap-2">
                      {(uploadState.status === 'uploading' || uploadState.status === 'extracting' || uploadState.status === 'saving') && (
                        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                      )}
                      {(uploadState.status === 'reviewing' || uploadState.status === 'done') && (
                        <CheckCircle className="h-4 w-4 text-green-500" />
                      )}
                      <span className="text-sm font-semibold text-foreground">
                        {uploadState.status === 'uploading' && 'Uploading…'}
                        {uploadState.status === 'extracting' && 'AI reading file…'}
                        {uploadState.status === 'reviewing' && uploadState.mode === 'per_respondent' && `Review ${uploadState.respondents.length} respondents`}
                        {uploadState.status === 'reviewing' && uploadState.mode === 'thematic' && `Review ${uploadState.drafts.length} insights`}
                        {uploadState.status === 'saving' && 'Saving…'}
                        {uploadState.status === 'done' && 'Insights saved'}
                        {uploadState.status === 'error' && 'Issue'}
                      </span>
                      {uploadState.status === 'reviewing' && uploadState.mode === 'per_respondent' && (
                        <span className="rounded-full bg-blue-500/10 border border-blue-200 dark:border-blue-800 px-1.5 py-0.5 text-[10px] text-blue-700 dark:text-blue-400 font-medium">Per-person</span>
                      )}
                    </div>
                    <button type="button" onClick={() => setUploadState(null)} className="rounded-md p-1 text-muted-foreground hover:bg-accent transition-colors">
                      <X className="h-4 w-4" />
                    </button>
                  </div>

                  {uploadState.status === 'error' && (
                    <div className="px-5 py-4">
                      <p className="text-sm text-destructive">{uploadState.error}</p>
                    </div>
                  )}

                  {uploadState.status === 'done' && (
                    <div className="px-5 py-4">
                      <p className="text-sm text-muted-foreground">
                        {(uploadState.savedCount ?? 0) === 0 ? 'No insights saved.' : `${uploadState.savedCount} insight${uploadState.savedCount !== 1 ? 's' : ''} added.`}
                      </p>
                    </div>
                  )}

                  {/* Thematic review */}
                  {uploadState.status === 'reviewing' && uploadState.mode === 'thematic' && (
                    <>
                      <div className="divide-y divide-border max-h-[40vh] overflow-y-auto">
                        {uploadState.drafts.map((draft, i) => (
                          <div key={i} className="flex gap-3 px-5 py-3">
                            <div className="flex-1 space-y-1.5">
                              <textarea value={draft.content} onChange={(e) => updateDraft(i, 'content', e.target.value)} rows={2} className="w-full resize-none rounded-md border border-input bg-background px-2.5 py-1.5 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-ring" />
                              <div className="flex flex-wrap gap-1.5">
                                <select value={draft.category} onChange={(e) => updateDraft(i, 'category', e.target.value)} className="rounded border border-input bg-background px-2 py-0.5 text-[11px] text-foreground focus:outline-none">
                                  {Object.entries(CATEGORY_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                                </select>
                                <select value={draft.impact} onChange={(e) => updateDraft(i, 'impact', e.target.value)} className={cn('rounded border px-2 py-0.5 text-[11px] font-medium focus:outline-none', IMPACT_BADGE[draft.impact])}>
                                  <option value="high">High</option>
                                  <option value="medium">Medium</option>
                                  <option value="low">Low</option>
                                </select>
                                {contacts.length > 0 && (
                                  <select value={draft.source_contact_id ?? ''} onChange={(e) => updateDraft(i, 'source_contact_id', e.target.value || null)} className="rounded border border-input bg-background px-2 py-0.5 text-[11px] text-foreground focus:outline-none">
                                    <option value="">No contact</option>
                                    {contacts.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                                  </select>
                                )}
                              </div>
                            </div>
                            <button type="button" onClick={() => removeDraft(i)} className="mt-1 shrink-0 rounded-md p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors">
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        ))}
                      </div>
                      <div className="flex items-center justify-between px-5 py-3 border-t border-border">
                        <p className="text-xs text-muted-foreground">Tagged as <strong>{meta.label}</strong></p>
                        <button type="button" onClick={handleConfirm} disabled={uploadState.drafts.length === 0} className="rounded-md bg-primary px-4 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50">
                          Save {uploadState.drafts.length}
                        </button>
                      </div>
                    </>
                  )}

                  {/* Per-respondent review */}
                  {uploadState.status === 'reviewing' && uploadState.mode === 'per_respondent' && (
                    <>
                      <div className="max-h-[50vh] overflow-y-auto divide-y divide-border">
                        {uploadState.respondents.map((r, rIdx) => {
                          const identity = r.name ?? r.email ?? `Respondent ${rIdx + 1}`
                          return (
                            <div key={rIdx} className="px-5 py-3 space-y-2">
                              <div className="flex items-center gap-2">
                                <User className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                                <span className="text-xs font-semibold text-foreground flex-1 min-w-0 truncate">{identity}</span>
                                {r.contact_id ? (
                                  <span className="flex items-center gap-1 text-[11px] text-green-700 dark:text-green-400 shrink-0">
                                    <CheckCircle className="h-3 w-3" />{r.contact_name}
                                  </span>
                                ) : (
                                  <div className="flex items-center gap-1 shrink-0">
                                    <AlertCircle className="h-3 w-3 text-amber-500" />
                                    <select value={r.contact_id ?? ''} onChange={(e) => updateRespondentContact(rIdx, e.target.value || null)} className="rounded border border-input bg-background px-1.5 py-0.5 text-[11px] focus:outline-none">
                                      <option value="">Link…</option>
                                      {contacts.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                                    </select>
                                  </div>
                                )}
                              </div>
                              <div className="pl-5 space-y-1.5">
                                {r.insights.map((ins, iIdx) => (
                                  <div key={iIdx} className="flex gap-2">
                                    <div className="flex-1 space-y-1">
                                      <textarea value={ins.content} onChange={(e) => updateRespondentInsight(rIdx, iIdx, 'content', e.target.value)} rows={2} className="w-full resize-none rounded-md border border-input bg-background px-2 py-1 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring" />
                                      <div className="flex flex-wrap gap-1">
                                        <select value={ins.category} onChange={(e) => updateRespondentInsight(rIdx, iIdx, 'category', e.target.value)} className="rounded border border-input bg-background px-1.5 py-0.5 text-[11px] focus:outline-none">
                                          {Object.entries(CATEGORY_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                                        </select>
                                        <select value={ins.impact} onChange={(e) => updateRespondentInsight(rIdx, iIdx, 'impact', e.target.value)} className={cn('rounded border px-1.5 py-0.5 text-[11px] font-medium focus:outline-none', IMPACT_BADGE[ins.impact])}>
                                          <option value="high">High</option>
                                          <option value="medium">Medium</option>
                                          <option value="low">Low</option>
                                        </select>
                                      </div>
                                    </div>
                                    <button type="button" onClick={() => removeRespondentInsight(rIdx, iIdx)} className="mt-1 shrink-0 rounded-md p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors">
                                      <Trash2 className="h-3 w-3" />
                                    </button>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )
                        })}
                      </div>
                      <div className="flex items-center justify-between px-5 py-3 border-t border-border">
                        <p className="text-xs text-muted-foreground">
                          {uploadState.respondents.filter((r) => !r.contact_id).length > 0 && (
                            <span className="text-amber-600 dark:text-amber-400 mr-1">
                              {uploadState.respondents.filter((r) => !r.contact_id).length} unmatched —
                            </span>
                          )}
                          {totalInsightCount(uploadState)} insights total
                        </p>
                        <button type="button" onClick={handleConfirm} disabled={totalInsightCount(uploadState) === 0} className="rounded-md bg-primary px-4 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50">
                          Save {totalInsightCount(uploadState)}
                        </button>
                      </div>
                    </>
                  )}
                </div>
              )}

              {/* Document list */}
              {segDocs.length === 0 && !uploadState && (
                <div className="rounded-lg border border-dashed border-border py-12 text-center">
                  <FileText className="h-6 w-6 text-muted-foreground/40 mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">No documents uploaded yet.</p>
                  <button type="button" onClick={handleUploadClick} className="mt-2 text-xs font-medium text-primary hover:underline">
                    Upload the first one
                  </button>
                </div>
              )}

              <div className="space-y-2">
                {segDocs.map((doc) => (
                  <div key={doc.id} className={cn('flex items-center gap-3 rounded-lg border border-border bg-background px-4 py-3', deletingId === doc.id && 'opacity-50')}>
                    <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-foreground truncate">{doc.file_name}</p>
                      <p className="text-[10px] text-muted-foreground">
                        {doc.insights_extracted} insight{doc.insights_extracted !== 1 ? 's' : ''} · {new Date(doc.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                      </p>
                    </div>
                    <button type="button" onClick={() => handleDeleteDocument(doc)} disabled={deletingId === doc.id} className="shrink-0 rounded-md p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors disabled:opacity-50">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
