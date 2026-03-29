'use client'

import { Sparkles, Check, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

export type SuggestState = {
  loading: boolean
  suggestion: string | null
  sources: string[]
  hasConflicts: boolean
  error: string | null
}

export function emptySuggestState(): SuggestState {
  return { loading: false, suggestion: null, sources: [], hasConflicts: false, error: null }
}

interface SuggestButtonProps {
  loading: boolean
  onTrigger: () => void
  disabled?: boolean
  label: string
}

export function SuggestButton({ loading, onTrigger, disabled, label }: SuggestButtonProps) {
  return (
    <button
      type="button"
      onClick={onTrigger}
      disabled={disabled || loading}
      aria-label={`Suggest a value for ${label}`}
      className={cn(
        'inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-xs font-medium transition-colors',
        'text-muted-foreground hover:text-foreground hover:bg-accent',
        'disabled:opacity-40 disabled:cursor-not-allowed',
        loading && 'animate-pulse',
      )}
    >
      <Sparkles className="h-3 w-3" />
      {loading ? 'Thinking…' : 'Suggest'}
    </button>
  )
}

interface SuggestBoxProps {
  state: SuggestState
  onAccept: (suggestion: string) => void
  onDismiss: () => void
}

export function SuggestBox({ state, onAccept, onDismiss }: SuggestBoxProps) {
  if (state.suggestion === null && !state.error) return null

  return (
    <div className="mt-2 rounded-lg border border-border bg-muted/40 p-3 space-y-2">
      {state.error ? (
        <p className="text-sm text-destructive">{state.error}</p>
      ) : (
        <>
          {state.hasConflicts && (
            <p className="text-xs text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
              <span aria-hidden="true">⚠</span>
              Conflicting documents detected — review the conflicts panel before accepting.
            </p>
          )}
          <div className="text-sm text-foreground leading-relaxed prose prose-sm max-w-none dark:prose-invert prose-p:my-1 prose-ul:my-1 prose-li:my-0.5 prose-headings:text-sm prose-headings:font-semibold prose-headings:mt-2 prose-headings:mb-1">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {state.suggestion}
            </ReactMarkdown>
          </div>
          {state.sources.length > 0 && (
            <p className="text-xs text-muted-foreground">
              Sources: {state.sources.join(', ')}
            </p>
          )}
          <div className="flex items-center gap-2 pt-1">
            <button
              type="button"
              onClick={() => state.suggestion !== null && onAccept(state.suggestion)}
              className="inline-flex items-center gap-1.5 rounded-md bg-foreground px-3 py-1.5 text-xs font-medium text-background hover:opacity-80 transition-opacity"
            >
              <Check className="h-3 w-3" />
              Use this
            </button>
            <button
              type="button"
              onClick={onDismiss}
              className="inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-xs font-medium text-foreground hover:bg-accent transition-colors"
            >
              <X className="h-3 w-3" />
              Dismiss
            </button>
          </div>
        </>
      )}
    </div>
  )
}
