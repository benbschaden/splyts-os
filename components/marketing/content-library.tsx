'use client'

import { Sparkles, FileText } from 'lucide-react'

export function ContentLibrary() {
  return (
    <div className="flex h-full flex-col gap-6">
      <div className="flex items-center justify-between">
        <div className="space-y-0.5">
          <h2 className="text-sm font-semibold text-foreground">Content</h2>
          <p className="text-sm text-muted-foreground">Your generated content lives here.</p>
        </div>
        <button
          onClick={() => {
            // TODO: open generate content dialog
          }}
          className="inline-flex items-center gap-1.5 rounded-md bg-foreground px-3 py-1.5 text-sm font-medium text-background transition-opacity hover:opacity-80"
        >
          <Sparkles className="h-3.5 w-3.5" />
          Generate
        </button>
      </div>

      <div className="flex flex-1 flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-border py-20 text-center">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
          <FileText className="h-5 w-5 text-muted-foreground" />
        </div>
        <div className="space-y-1">
          <p className="text-sm font-medium text-foreground">No content yet</p>
          <p className="text-sm text-muted-foreground">
            Hit Generate to create your first piece of content.
          </p>
        </div>
        <button
          onClick={() => {
            // TODO: open generate content dialog
          }}
          className="mt-2 inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-sm font-medium text-foreground transition-colors hover:bg-accent"
        >
          <Sparkles className="h-3.5 w-3.5" />
          Generate content
        </button>
      </div>
    </div>
  )
}
