'use client'

import type { DiscoveryEntryRow } from '@/lib/queries/discovery-entries'
import type { DiscoveryStudyRow } from '@/lib/queries/discovery-studies'
import { DiscoveryHub } from '@/components/projects/discovery-hub'

interface Project {
  id: string
  name: string
  description: string | null
}

interface CustomerDiscoveryDetailProps {
  project: Project
  initialStudies: DiscoveryStudyRow[]
  initialEntries: DiscoveryEntryRow[]
}

export function CustomerDiscoveryDetail({
  project,
  initialStudies,
  initialEntries,
}: CustomerDiscoveryDetailProps) {
  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex h-14 shrink-0 items-center border-b border-border px-6">
        <h1 className="text-sm font-semibold text-foreground">{project.name}</h1>
      </div>

      {/* Description */}
      {project.description && (
        <p className="shrink-0 px-6 pt-4 text-sm text-muted-foreground leading-relaxed">
          {project.description}
        </p>
      )}

      {/* Discovery hub — studies are the primary view */}
      <div className="flex-1 overflow-y-auto px-6 py-4">
        <DiscoveryHub
          projectId={project.id}
          initialStudies={initialStudies}
          initialEntries={initialEntries}
        />
      </div>
    </div>
  )
}
