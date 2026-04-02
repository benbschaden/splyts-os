'use client'

import { useState } from 'react'

export function ActivityReportClient() {
  const [query, setQuery] = useState('')
  const [report, setReport] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!query.trim() || loading) return

    setLoading(true)
    setError(null)
    setReport('')

    try {
      const res = await fetch('/api/admin/activity-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: query.trim() }),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setError(data.error || 'Failed to generate report')
        return
      }

      const data = await res.json()
      setReport(data.report)
    } catch {
      setError('Failed to generate report')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-8 px-8 py-8">
      <div>
        <h1 className="text-lg font-semibold text-foreground">Activity Reports</h1>
        <p className="mt-0.5 text-sm text-muted-foreground">
          Ask for any report — team summaries, SR&ED documentation, investor updates, or individual activity.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-3">
        <label htmlFor="report-query" className="sr-only">
          What report do you need?
        </label>
        <textarea
          id="report-query"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="e.g. &quot;What did the team accomplish this week?&quot; or &quot;SR&ED report for March 2026&quot;"
          className="w-full rounded-lg border border-border bg-background px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none"
          rows={3}
          disabled={loading}
        />
        <button
          type="submit"
          disabled={!query.trim() || loading}
          className="rounded-lg bg-foreground px-4 py-2 text-sm font-medium text-background transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {loading ? 'Generating...' : 'Generate Report'}
        </button>
      </form>

      {error && (
        <div className="rounded-lg border border-destructive/20 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {report && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-medium text-foreground">Report</h2>
            <button
              type="button"
              onClick={() => navigator.clipboard.writeText(report)}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              Copy to clipboard
            </button>
          </div>
          <div className="rounded-lg border border-border bg-muted/30 px-6 py-5 text-sm text-foreground leading-relaxed whitespace-pre-wrap">
            {report}
          </div>
        </div>
      )}
    </div>
  )
}
