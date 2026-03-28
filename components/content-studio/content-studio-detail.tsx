'use client'

import { useState, useRef } from 'react'
import { ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import { BacklogSection } from './backlog-section'
import { PublishedSection } from './published-section'
import { OutputsList, type OutputCardAttachment } from '@/components/projects/outputs-list'
import {
  GenerationSessionDialog,
  type GeneratedOutputPayload,
} from '@/components/marketing/generation-session-dialog'
import type { ContentIdeaRow } from '@/lib/queries/content-ideas'
import type { PublishedOutput } from '@/lib/queries/outputs'

type StudioOutput = {
  id: string
  brief: string
  content: string
  content_type_id: string
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
  metadata?: Record<string, unknown> | null
  content_types: { name: string } | null
  projects: { name: string } | null
  creator_full_name: string | null
}

interface Project {
  id: string
  name: string
  description: string | null
}

interface Author {
  id: string
  name: string
}

interface ContentType {
  id: string
  name: string
}

interface ContentStudioDetailProps {
  project: Project
  organizationId: string
  currentUserId: string
  isAdmin: boolean
  contentIdeas: ContentIdeaRow[]
  publishedOutputs: PublishedOutput[]
  outputs: StudioOutput[]
  outputAttachmentsByOutputId: Record<string, OutputCardAttachment[]>
  contentTypes: ContentType[]
  authors: Author[]
  hasBrandContext: boolean
}

export function ContentStudioDetail({
  project,
  contentIdeas,
  publishedOutputs,
  outputs: initialOutputs,
  outputAttachmentsByOutputId,
  contentTypes,
  authors,
  hasBrandContext,
}: ContentStudioDetailProps) {
  const [generateOpen, setGenerateOpen] = useState(false)
  const [generateSectionOpen, setGenerateSectionOpen] = useState(true)
  const [initialMessage, setInitialMessage] = useState('')
  const [pendingOutput, setPendingOutput] = useState<StudioOutput | null>(null)
  const generateRef = useRef<HTMLDivElement>(null)

  function handleBuildIdea(idea: ContentIdeaRow) {
    const parts = [
      `Write ${idea.platform} content for the ${idea.platform_owner === 'company' ? 'company page' : "author's page"}.`,
      `Idea: ${idea.title}`,
      idea.description ? `Context: ${idea.description}` : '',
    ].filter(Boolean)

    setInitialMessage(parts.join('\n'))
    setGenerateSectionOpen(true)
    setGenerateOpen(true)

    setTimeout(() => {
      generateRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }, 100)
  }

  function handleGenerated(newOutput: GeneratedOutputPayload) {
    const ct = contentTypes.find((c) => c.id === newOutput.content_type_id) ?? contentTypes[0]
    const full: StudioOutput = {
      id: newOutput.id,
      brief: newOutput.brief,
      content: newOutput.content,
      content_type_id: newOutput.content_type_id,
      model_id: newOutput.model_id,
      project_id: project.id,
      created_by: newOutput.created_by,
      created_at: newOutput.created_at,
      updated_at: newOutput.updated_at,
      published_at: null,
      reach: null,
      reach_metric: null,
      engagement: null,
      performance_notes: null,
      metadata: null,
      content_types: ct ? { name: ct.name } : null,
      projects: { name: project.name },
      creator_full_name: newOutput.creator_full_name,
    }
    setPendingOutput(full)
    setInitialMessage('')
  }

  function handleCloseDialog() {
    setGenerateOpen(false)
    setInitialMessage('')
  }

  return (
    <div className="flex flex-col">
      {/* Page header */}
      <div className="border-b border-border px-8 py-5">
        <h1 className="text-base font-semibold text-foreground">{project.name}</h1>
        {project.description && (
          <p className="mt-0.5 text-sm text-muted-foreground">{project.description}</p>
        )}
      </div>

      {/* Backlog section */}
      <BacklogSection
        projectId={project.id}
        initialIdeas={contentIdeas}
        onBuildIdea={handleBuildIdea}
      />

      {/* Generate section */}
      <section ref={generateRef} className="border-t border-border">
        <button
          type="button"
          onClick={() => setGenerateSectionOpen((o) => !o)}
          className="flex w-full items-center justify-between px-6 py-4 hover:bg-accent/30 transition-colors"
        >
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-foreground">Generate</span>
            <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
              {initialOutputs.length}
            </span>
          </div>
          <ChevronDown
            className={cn(
              'h-4 w-4 text-muted-foreground transition-transform',
              generateSectionOpen ? 'rotate-0' : '-rotate-90',
            )}
            aria-hidden
          />
        </button>

        {generateSectionOpen && (
          <div className="px-6 pb-6">
            <OutputsList
              projectId={project.id}
              initialOutputs={initialOutputs}
              outputAttachmentsByOutputId={outputAttachmentsByOutputId}
              authors={authors}
              contentTypes={contentTypes}
              hasBrandContext={hasBrandContext}
              showPublish
              pendingOutput={pendingOutput}
            />
          </div>
        )}
      </section>

      {/* Published section */}
      <PublishedSection initialOutputs={publishedOutputs} />

      {/* Generation dialog — opened from Backlog "Build" or Generate "Generate" button */}
      <GenerationSessionDialog
        open={generateOpen}
        onClose={handleCloseDialog}
        onGenerated={handleGenerated}
        projectId={project.id}
        authors={authors}
        contentTypes={contentTypes}
        hasBrandContext={hasBrandContext}
        initialUserMessage={initialMessage}
      />
    </div>
  )
}
