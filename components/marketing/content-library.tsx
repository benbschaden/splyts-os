'use client'

import { useState } from 'react'
import { Sparkles, FileText } from 'lucide-react'
import { GenerateContentDialog } from '@/components/marketing/generate-content-dialog'

interface Author {
  id: string
  name: string
}

interface ContentType {
  id: string
  name: string
}

interface Project {
  id: string
  name: string
}

interface ContentLibraryProps {
  contentTypes: ContentType[]
  authors: Author[]
  hasBrandContext: boolean
  projects: Project[]
}

export function ContentLibrary({
  contentTypes,
  authors,
  hasBrandContext,
  projects,
}: ContentLibraryProps) {
  const [dialogOpen, setDialogOpen] = useState(false)
  const [selectedProjectId, setSelectedProjectId] = useState(projects[0]?.id ?? '')

  const hasProjects = projects.length > 0

  return (
    <div className="flex h-full flex-col gap-6">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-0.5">
          <h2 className="text-sm font-semibold text-foreground">Content</h2>
          <p className="text-sm text-muted-foreground">Generate and view content across all projects.</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {hasProjects && (
            <select
              value={selectedProjectId}
              onChange={(e) => setSelectedProjectId(e.target.value)}
              className="rounded-md border border-input bg-background px-3 py-1.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            >
              {projects.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          )}
          <button
            onClick={() => hasProjects && setDialogOpen(true)}
            disabled={!hasProjects}
            className="inline-flex items-center gap-1.5 rounded-md bg-foreground px-3 py-1.5 text-sm font-medium text-background transition-opacity hover:opacity-80 disabled:opacity-40"
          >
            <Sparkles className="h-3.5 w-3.5" />
            Generate
          </button>
        </div>
      </div>

      {!hasProjects ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-border py-20 text-center">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
            <FileText className="h-5 w-5 text-muted-foreground" />
          </div>
          <div className="space-y-1">
            <p className="text-sm font-medium text-foreground">No projects yet</p>
            <p className="text-sm text-muted-foreground">
              Create a project first, then generate content inside it.
            </p>
          </div>
        </div>
      ) : (
        <div className="flex flex-1 flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-border py-20 text-center">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
            <FileText className="h-5 w-5 text-muted-foreground" />
          </div>
          <div className="space-y-1">
            <p className="text-sm font-medium text-foreground">Generate from here or inside a project</p>
            <p className="text-sm text-muted-foreground">
              Select a project above, then hit Generate.
            </p>
          </div>
          <button
            onClick={() => setDialogOpen(true)}
            className="mt-2 inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            <Sparkles className="h-3.5 w-3.5" />
            Generate content
          </button>
        </div>
      )}

      <GenerateContentDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onGenerated={() => {
          setDialogOpen(false)
          // Redirect to the project to see the output
          if (selectedProjectId) {
            window.location.href = `/dashboard/projects/${selectedProjectId}`
          }
        }}
        projectId={selectedProjectId}
        authors={authors}
        contentTypes={contentTypes}
        hasBrandContext={hasBrandContext}
      />
    </div>
  )
}
