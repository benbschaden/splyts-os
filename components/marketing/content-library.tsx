'use client'

import Link from 'next/link'
import { FileText } from 'lucide-react'

interface Output {
  id: string
  brief: string
  content: string
  project_id: string
  created_at: string
  content_types: { name: string } | null
  projects: { name: string } | null
}

interface ContentLibraryProps {
  outputs: Output[]
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

export function ContentLibrary({ outputs }: ContentLibraryProps) {
  if (outputs.length === 0) {
    return (
      <div className="flex h-full flex-col gap-6">
        <div className="space-y-0.5">
          <h2 className="text-sm font-semibold text-foreground">Content</h2>
          <p className="text-sm text-muted-foreground">All generated content across your projects.</p>
        </div>

        <div className="flex flex-1 flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-border py-20 text-center">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
            <FileText className="h-5 w-5 text-muted-foreground" />
          </div>
          <div className="space-y-1">
            <p className="text-sm font-medium text-foreground">No content yet</p>
            <p className="text-sm text-muted-foreground">
              Open a project and hit Generate to create your first piece.
            </p>
          </div>
          <Link
            href="/dashboard"
            className="mt-2 inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            Go to Projects →
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div className="space-y-0.5">
          <h2 className="text-sm font-semibold text-foreground">Content</h2>
          <p className="text-sm text-muted-foreground">
            {outputs.length} piece{outputs.length === 1 ? '' : 's'} generated across all projects.
          </p>
        </div>
      </div>

      <div className="flex flex-col gap-3">
        {outputs.map((output) => {
          const preview = output.content.slice(0, 200) + (output.content.length > 200 ? '…' : '')
          return (
            <Link
              key={output.id}
              href={`/dashboard/projects/${output.project_id}`}
              className="group rounded-lg border border-border bg-background p-4 transition-colors hover:border-foreground/20 hover:bg-accent/40"
            >
              <div className="flex items-center gap-2 mb-2">
                <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
                  {output.content_types?.name ?? 'Unknown type'}
                </span>
                {output.projects?.name && (
                  <span className="text-xs text-muted-foreground">
                    {output.projects.name}
                  </span>
                )}
                <span className="ml-auto text-xs text-muted-foreground">
                  {formatDate(output.created_at)}
                </span>
              </div>
              <p className="text-xs text-muted-foreground mb-1.5 line-clamp-1">
                <span className="font-medium">Brief:</span> {output.brief}
              </p>
              <p className="text-sm text-foreground leading-relaxed line-clamp-3">
                {preview}
              </p>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
