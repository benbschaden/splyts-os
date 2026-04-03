'use client'

import { useState, useRef } from 'react'
import { Upload, FileText, Trash2, CheckCircle, X, ChevronDown, ChevronUp, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { CohortDocumentRow, CohortDocumentSegment } from '@/lib/queries/cohort-documents'
import type { CustomerInsightRow, InsightCategory, InsightImpact } from '@/lib/queries/customer-insights'

interface DraftInsight {
  content: string
  category: InsightCategory
  impact: InsightImpact
  source_contact_id?: string | null
}

interface UploadState {
  segment: CohortDocumentSegment
  status: 'uploading' | 'extracting' | 'reviewing' | 'saving' | 'done' | 'error'
  error?: string
  documentId?: string
  drafts: DraftInsight[]
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

const SEGMENT_META: Record<CohortDocumentSegment, { label: string; description: string; color: string }> = {
  beta_user: {
    label: 'Beta Users',
    description: 'Early adopters testing the product',
    color: 'bg-blue-500/10 border-blue-200 dark:border-blue-800',
  },
  free_user: {
    label: 'Free Users',
    description: 'Active on the free tier',
    color: 'bg-sky-500/10 border-sky-200 dark:border-sky-800',
  },
  customer: {
    label: 'Paying Customers',
    description: 'Active paid subscribers',
    color: 'bg-green-500/10 border-green-200 dark:border-green-800',
  },
  power_user: {
    label: 'Power Users',
    description: 'Highly engaged, frequent users',
    color: 'bg-violet-500/10 border-violet-200 dark:border-violet-800',
  },
  prospect: {
    label: 'Prospects',
    description: 'Potential customers in evaluation',
    color: 'bg-amber-500/10 border-amber-200 dark:border-amber-800',
  },
  churned: {
    label: 'Churned Users',
    description: 'Former customers who left',
    color: 'bg-red-500/10 border-red-200 dark:border-red-800',
  },
  other: {
    label: 'Other',
    description: 'Uncategorized segment',
    color: 'bg-muted border-border',
  },
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

export function CohortsView({ projectId, initialDocuments, contacts = [], onInsightsAdded }: CohortsViewProps) {
  const [documents, setDocuments] = useState<CohortDocumentRow[]>(initialDocuments)
  const [uploadState, setUploadState] = useState<UploadState | null>(null)
  const [expandedSegment, setExpandedSegment] = useState<CohortDocumentSegment | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const activeSegmentRef = useRef<CohortDocumentSegment | null>(null)

  function docsBySegment(seg: CohortDocumentSegment) {
    return documents.filter((d) => d.segment === seg)
  }

  function handleUploadClick(segment: CohortDocumentSegment) {
    activeSegmentRef.current = segment
    fileInputRef.current?.click()
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    const segment = activeSegmentRef.current
    e.target.value = ''
    if (!file || !segment) return

    setUploadState({ segment, status: 'uploading', drafts: [] })
    setExpandedSegment(segment)

    const formData = new FormData()
    formData.append('file', file)
    formData.append('segment', segment)
    formData.append('projectId', projectId)

    try {
      setUploadState((prev) => prev ? { ...prev, status: 'extracting' } : prev)

      const res = await fetch('/api/cohort-documents/upload', {
        method: 'POST',
        body: formData,
      })

      if (!res.ok) {
        const data = await res.json()
        setUploadState((prev) => prev ? {
          ...prev,
          status: 'error',
          error: data.error ?? 'Upload failed. Please try again.',
        } : prev)
        return
      }

      const data = await res.json()
      const newDoc: CohortDocumentRow = data.document
      const drafts: DraftInsight[] = data.drafts ?? []

      setDocuments((prev) => [newDoc, ...prev])

      if (drafts.length === 0) {
        setUploadState((prev) => prev ? {
          ...prev,
          status: 'error',
          error: 'File uploaded but no insights could be extracted. The file may be empty or image-based.',
          documentId: newDoc.id,
        } : prev)
        return
      }

      setUploadState({
        segment,
        status: 'reviewing',
        documentId: newDoc.id,
        drafts,
      })
    } catch {
      setUploadState((prev) => prev ? {
        ...prev,
        status: 'error',
        error: 'Something went wrong. Please try again.',
      } : prev)
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
      const drafts = prev.drafts.filter((_, i) => i !== index)
      return { ...prev, drafts }
    })
  }

  async function handleConfirm() {
    if (!uploadState || !uploadState.documentId || uploadState.drafts.length === 0) return

    setUploadState((prev) => prev ? { ...prev, status: 'saving' } : prev)

    try {
      const res = await fetch(`/api/cohort-documents/${uploadState.documentId}/confirm`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ insights: uploadState.drafts }),
      })

      if (!res.ok) {
        setUploadState((prev) => prev ? { ...prev, status: 'error', error: 'Failed to save insights.' } : prev)
        return
      }

      const data = await res.json()
      const saved: CustomerInsightRow[] = data.insights ?? []

      // Update document's insight count in local state
      setDocuments((prev) =>
        prev.map((d) =>
          d.id === uploadState.documentId
            ? { ...d, insights_extracted: saved.length, status: 'processed' }
            : d,
        ),
      )

      onInsightsAdded(saved)
      setUploadState((prev) => prev ? { ...prev, status: 'done' } : prev)
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

  function dismissUpload() {
    setUploadState(null)
  }

  return (
    <div className="flex flex-col gap-4 p-6">
      <input
        ref={fileInputRef}
        type="file"
        accept={ACCEPTED_TYPES}
        className="hidden"
        onChange={handleFileChange}
        aria-hidden="true"
      />

      {/* Upload / review panel */}
      {uploadState && (
        <div className="rounded-xl border border-border bg-background shadow-sm">
          <div className="flex items-center justify-between px-5 py-4 border-b border-border">
            <div className="flex items-center gap-2.5">
              {(uploadState.status === 'uploading' || uploadState.status === 'extracting') && (
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              )}
              {uploadState.status === 'reviewing' && (
                <CheckCircle className="h-4 w-4 text-green-500" />
              )}
              {uploadState.status === 'saving' && (
                <Loader2 className="h-4 w-4 animate-spin text-primary" />
              )}
              {uploadState.status === 'done' && (
                <CheckCircle className="h-4 w-4 text-green-500" />
              )}
              <span className="text-sm font-semibold text-foreground">
                {uploadState.status === 'uploading' && 'Uploading file…'}
                {uploadState.status === 'extracting' && 'AI is reading the file…'}
                {uploadState.status === 'reviewing' && `Review ${uploadState.drafts.length} extracted insights`}
                {uploadState.status === 'saving' && 'Saving insights…'}
                {uploadState.status === 'done' && 'Insights saved'}
                {uploadState.status === 'error' && 'Upload issue'}
              </span>
              {uploadState.status === 'reviewing' && (
                <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
                  {SEGMENT_META[uploadState.segment].label}
                </span>
              )}
            </div>
            <button
              type="button"
              onClick={dismissUpload}
              className="rounded-md p-1 text-muted-foreground hover:bg-accent transition-colors"
              aria-label="Dismiss"
            >
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
                {uploadState.drafts.length === 0
                  ? 'No insights were saved.'
                  : `${uploadState.drafts.length} insights added to the Insights tab and AI context.`}
              </p>
            </div>
          )}

          {uploadState.status === 'reviewing' && uploadState.drafts.length > 0 && (
            <>
              <div className="divide-y divide-border max-h-[50vh] overflow-y-auto">
                {uploadState.drafts.map((draft, i) => (
                  <div key={i} className="flex gap-3 px-5 py-3">
                    <div className="flex-1 space-y-2">
                      <textarea
                        value={draft.content}
                        onChange={(e) => updateDraft(i, 'content', e.target.value)}
                        rows={2}
                        className="w-full resize-none rounded-md border border-input bg-background px-2.5 py-1.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                      />
                      <div className="flex flex-wrap items-center gap-2">
                        <select
                          value={draft.category}
                          onChange={(e) => updateDraft(i, 'category', e.target.value)}
                          className="rounded border border-input bg-background px-2 py-0.5 text-[11px] text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                        >
                          {Object.entries(CATEGORY_LABELS).map(([k, v]) => (
                            <option key={k} value={k}>{v}</option>
                          ))}
                        </select>
                        <select
                          value={draft.impact}
                          onChange={(e) => updateDraft(i, 'impact', e.target.value)}
                          className={cn(
                            'rounded border px-2 py-0.5 text-[11px] font-medium focus:outline-none focus:ring-1 focus:ring-ring',
                            IMPACT_BADGE[draft.impact],
                          )}
                        >
                          <option value="high">High impact</option>
                          <option value="medium">Medium impact</option>
                          <option value="low">Low impact</option>
                        </select>
                        {contacts.length > 0 && (
                          <select
                            value={draft.source_contact_id ?? ''}
                            onChange={(e) => updateDraft(i, 'source_contact_id', e.target.value || null)}
                            className="rounded border border-input bg-background px-2 py-0.5 text-[11px] text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                            title="Link to a specific contact"
                          >
                            <option value="">No contact</option>
                            {contacts.map((c) => (
                              <option key={c.id} value={c.id}>{c.name}</option>
                            ))}
                          </select>
                        )}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeDraft(i)}
                      className="mt-1 shrink-0 rounded-md p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
                      aria-label="Remove insight"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
              <div className="flex items-center justify-between gap-3 px-5 py-4 border-t border-border">
                <p className="text-xs text-muted-foreground">
                  Edit or remove insights before saving. All saved insights will be tagged as{' '}
                  <strong>{SEGMENT_META[uploadState.segment].label}</strong> and included in AI context.
                </p>
                <button
                  type="button"
                  onClick={handleConfirm}
                  className="shrink-0 rounded-md bg-primary px-4 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
                >
                  Save {uploadState.drafts.length} insight{uploadState.drafts.length !== 1 ? 's' : ''}
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {/* Segment cards */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {SEGMENT_ORDER.map((seg) => {
          const meta = SEGMENT_META[seg]
          const docs = docsBySegment(seg)
          const totalInsights = docs.reduce((sum, d) => sum + d.insights_extracted, 0)
          const isExpanded = expandedSegment === seg

          return (
            <div
              key={seg}
              className={cn('rounded-xl border bg-background transition-all', meta.color)}
            >
              {/* Card header */}
              <div className="flex items-start justify-between px-4 py-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground">{meta.label}</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">{meta.description}</p>
                  {docs.length > 0 && (
                    <div className="flex gap-3 mt-1.5">
                      <span className="text-[11px] text-muted-foreground">
                        {docs.length} doc{docs.length !== 1 ? 's' : ''}
                      </span>
                      <span className="text-[11px] text-muted-foreground">
                        {totalInsights} insight{totalInsights !== 1 ? 's' : ''}
                      </span>
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-1 shrink-0 ml-2">
                  {docs.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setExpandedSegment(isExpanded ? null : seg)}
                      className="rounded-md p-1.5 text-muted-foreground hover:bg-accent/50 transition-colors"
                      aria-label={isExpanded ? 'Collapse' : 'Expand'}
                    >
                      {isExpanded ? (
                        <ChevronUp className="h-3.5 w-3.5" />
                      ) : (
                        <ChevronDown className="h-3.5 w-3.5" />
                      )}
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => handleUploadClick(seg)}
                    className="flex items-center gap-1 rounded-md bg-primary/10 px-2.5 py-1.5 text-xs font-medium text-primary hover:bg-primary/20 transition-colors"
                    aria-label={`Upload to ${meta.label}`}
                  >
                    <Upload className="h-3 w-3" />
                    Upload
                  </button>
                </div>
              </div>

              {/* Uploaded docs list */}
              {isExpanded && docs.length > 0 && (
                <div className="border-t border-border divide-y divide-border/60">
                  {docs.map((doc) => (
                    <div
                      key={doc.id}
                      className={cn(
                        'flex items-center gap-3 px-4 py-2.5',
                        deletingId === doc.id && 'opacity-50',
                      )}
                    >
                      <FileText className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-foreground truncate">{doc.file_name}</p>
                        <p className="text-[10px] text-muted-foreground">
                          {doc.insights_extracted} insight{doc.insights_extracted !== 1 ? 's' : ''} extracted
                          {' · '}
                          {new Date(doc.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleDeleteDocument(doc)}
                        disabled={deletingId === doc.id}
                        className="shrink-0 rounded-md p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors disabled:opacity-50"
                        aria-label="Delete document"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Empty state hint */}
              {docs.length === 0 && (
                <div className="px-4 pb-3">
                  <p className="text-[11px] text-muted-foreground/60">
                    Upload a survey, CSV, or doc to extract insights
                  </p>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
