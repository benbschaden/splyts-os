'use client'

import { useState } from 'react'
import { X, Sparkles, Loader2, Check } from 'lucide-react'
import { cn } from '@/lib/utils'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

const OUTPUT_TYPES = [
  'Brief',
  'Report',
  'Analysis',
  'Strategy',
  'Plan',
  'Summary',
  'Proposal',
  'Meeting notes',
  'Specification',
  'Other',
]

interface GeneratedOutput {
  id: string
  brief: string
  content: string
  content_type_id: string | null
  model_id: string
  project_id: string
  created_by: string
  created_at: string
  updated_at: string
  published_at: string | null
  reach: number | null
  reach_metric: string | null
  engagement: number | null
  performance_notes: string | null
  creator_full_name: string | null
}

interface ProjectOutputDialogProps {
  open: boolean
  projectId: string
  onClose: () => void
  onGenerated: (output: GeneratedOutput) => void
}

type Stage = 'form' | 'generating' | 'preview'

export function ProjectOutputDialog({
  open,
  projectId,
  onClose,
  onGenerated,
}: ProjectOutputDialogProps) {
  const [stage, setStage] = useState<Stage>('form')
  const [outputType, setOutputType] = useState('Brief')
  const [description, setDescription] = useState('')
  const [generatedOutput, setGeneratedOutput] = useState<GeneratedOutput | null>(null)
  const [error, setError] = useState<string | null>(null)

  function handleClose() {
    if (stage === 'generating') return
    setStage('form')
    setOutputType('Brief')
    setDescription('')
    setGeneratedOutput(null)
    setError(null)
    onClose()
  }

  async function handleGenerate() {
    if (!description.trim()) return
    setStage('generating')
    setError(null)

    try {
      const res = await fetch(`/api/projects/${projectId}/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ description: description.trim(), outputType }),
      })

      if (!res.ok) {
        const data = await res.json()
        setError(data.error ?? 'Generation failed. Please try again.')
        setStage('form')
        return
      }

      const data = await res.json()
      setGeneratedOutput(data.output)
      setStage('preview')
    } catch {
      setError('Generation failed. Please try again.')
      setStage('form')
    }
  }

  function handleSave() {
    if (!generatedOutput) return
    onGenerated(generatedOutput)
    handleClose()
  }

  function handleRegenerate() {
    setGeneratedOutput(null)
    setStage('form')
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/20" onClick={handleClose} />

      <div className={cn(
        'relative z-10 w-full bg-background rounded-lg border border-border shadow-xl overflow-hidden flex flex-col',
        stage === 'preview' ? 'max-w-2xl max-h-[85vh]' : 'max-w-lg',
      )}>
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border shrink-0">
          <div>
            <h2 className="text-sm font-semibold text-foreground">Create a project output</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              AI will generate a deliverable using your project materials
            </p>
          </div>
          <button
            type="button"
            onClick={handleClose}
            disabled={stage === 'generating'}
            className="rounded-md p-1.5 text-muted-foreground hover:text-foreground hover:bg-accent transition-colors disabled:opacity-40"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body */}
        {stage === 'form' && (
          <div className="p-5 space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-foreground">Output type</label>
              <select
                value={outputType}
                onChange={(e) => setOutputType(e.target.value)}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              >
                {OUTPUT_TYPES.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-foreground">
                What do you need?
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder={`Describe what this ${outputType.toLowerCase()} should cover…`}
                rows={5}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground resize-none focus:outline-none focus:ring-2 focus:ring-ring"
                autoFocus
              />
            </div>

            {error && <p className="text-xs text-destructive">{error}</p>}

            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={handleClose}
                className="rounded-md px-4 py-2 text-sm font-medium text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleGenerate}
                disabled={!description.trim()}
                className="inline-flex items-center gap-1.5 rounded-md bg-foreground px-4 py-2 text-sm font-medium text-background hover:opacity-80 transition-opacity disabled:opacity-40"
              >
                <Sparkles className="h-3.5 w-3.5" />
                Generate {outputType}
              </button>
            </div>
          </div>
        )}

        {stage === 'generating' && (
          <div className="flex flex-col items-center justify-center gap-3 py-16 px-5">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            <p className="text-sm text-muted-foreground">Generating your {outputType.toLowerCase()}…</p>
          </div>
        )}

        {stage === 'preview' && generatedOutput && (
          <>
            <div className="flex-1 overflow-y-auto p-5">
              <div className="prose prose-sm max-w-none dark:prose-invert prose-p:my-1.5 prose-ul:my-1 prose-li:my-0.5 prose-headings:font-semibold prose-headings:mt-4 prose-headings:mb-2 text-foreground text-sm leading-relaxed">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {generatedOutput.content}
                </ReactMarkdown>
              </div>
            </div>

            <div className="flex items-center justify-between gap-2 px-5 py-3 border-t border-border shrink-0 bg-muted/30">
              <button
                type="button"
                onClick={handleRegenerate}
                className="rounded-md px-3 py-1.5 text-sm font-medium text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
              >
                Regenerate
              </button>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleClose}
                  className="rounded-md px-3 py-1.5 text-sm font-medium text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
                >
                  Discard
                </button>
                <button
                  type="button"
                  onClick={handleSave}
                  className="inline-flex items-center gap-1.5 rounded-md bg-foreground px-4 py-1.5 text-sm font-medium text-background hover:opacity-80 transition-opacity"
                >
                  <Check className="h-3.5 w-3.5" />
                  Save to project
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
