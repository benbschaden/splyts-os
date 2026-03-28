'use client'

import { useMemo, useState } from 'react'
import { FolderOpen, Plus } from 'lucide-react'
import { NewProjectDialog } from './new-project-dialog'
import { ProjectCard } from './project-card'
import { Greeting } from '@/components/dashboard/greeting'
import { cn } from '@/lib/utils'

interface Project {
  id: string
  name: string
  description: string | null
  category: string | null
  updated_at: string
  visibility?: string | null
  status?: string | null
  tags?: string[] | null
}

interface ProjectsListProps {
  projects: Project[]
  userName: string
  activeCategory: string | null
  currentUserId?: string
}

type VisibilityFilter = 'all' | 'my' | 'shared'

export function ProjectsList({ projects, userName, activeCategory, currentUserId }: ProjectsListProps) {
  const [dialogOpen, setDialogOpen] = useState(false)
  const [visibilityFilter, setVisibilityFilter] = useState<VisibilityFilter>('all')

  const filteredProjects = useMemo(() => {
    if (visibilityFilter === 'my') {
      return projects.filter((p) => (p.visibility ?? 'organization') === 'private')
    }
    if (visibilityFilter === 'shared') {
      return projects.filter((p) => (p.visibility ?? 'organization') !== 'private')
    }
    return projects
  }, [projects, visibilityFilter])

  return (
    <>
      <div className="flex h-full flex-col">
        <Greeting name={userName} />

        <div className="flex items-center justify-between border-t border-border px-8 py-4">
          <div>
            <h2 className="text-sm font-semibold text-foreground">
              {activeCategory ?? 'All projects'}
            </h2>
            {projects.length > 0 && (
              <p className="text-xs text-muted-foreground mt-0.5 tabular-nums">
                {filteredProjects.length === projects.length
                  ? `${projects.length} project${projects.length !== 1 ? 's' : ''}`
                  : `${filteredProjects.length} of ${projects.length} project${projects.length !== 1 ? 's' : ''}`}
              </p>
            )}
          </div>
          <button
            onClick={() => setDialogOpen(true)}
            className={cn(
              'flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground',
              'hover:bg-primary/90 transition-colors',
            )}
          >
            <Plus className="h-3.5 w-3.5" />
            New project
          </button>
        </div>

        {projects.length > 0 && (
          <div className="flex flex-wrap items-center gap-2 border-t border-border px-8 py-3">
            <span className="text-xs font-medium text-muted-foreground">Show:</span>
            {(['all', 'my', 'shared'] as const).map((key) => {
              const label =
                key === 'all' ? 'All' : key === 'my' ? 'Private' : 'Shared'
              const isActive = visibilityFilter === key
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => setVisibilityFilter(key)}
                  className={cn(
                    'rounded-md px-2.5 py-1 text-xs font-medium transition-colors',
                    isActive
                      ? 'bg-accent text-accent-foreground'
                      : 'text-muted-foreground hover:bg-accent/50 hover:text-foreground',
                  )}
                >
                  {label}
                </button>
              )
            })}
          </div>
        )}

        {projects.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
              <FolderOpen className="h-5 w-5 text-muted-foreground" />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium text-foreground">
                {activeCategory ? `No ${activeCategory} projects yet` : 'No projects yet'}
              </p>
              <p className="text-sm text-muted-foreground">
                Create your first project to get started
              </p>
            </div>
            <button
              onClick={() => setDialogOpen(true)}
              className="mt-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              New project
            </button>
          </div>
        ) : filteredProjects.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 px-8 text-center">
            <p className="text-sm text-muted-foreground">
              No projects match this filter.
            </p>
            <button
              type="button"
              onClick={() => setVisibilityFilter('all')}
              className="text-sm font-medium text-primary hover:underline"
            >
              Show all projects
            </button>
          </div>
        ) : (
          <div className="px-8 pb-8">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {filteredProjects.map((project) => (
                <ProjectCard
                  key={project.id}
                  id={project.id}
                  name={project.name}
                  description={project.description}
                  updatedAt={project.updated_at}
                  visibility={project.visibility}
                  status={project.status}
                  tags={project.tags}
                />
              ))}
            </div>
          </div>
        )}
      </div>

      <NewProjectDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        defaultCategory={activeCategory ?? undefined}
        currentUserId={currentUserId}
      />
    </>
  )
}
