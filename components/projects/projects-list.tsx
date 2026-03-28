'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { FolderOpen, Plus, Wrench } from 'lucide-react'
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
  project_type?: string | null
  start_date?: string | null
  estimated_end_date?: string | null
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

  const tools = useMemo(
    () => projects.filter((p) => p.project_type === 'tool'),
    [projects],
  )

  const userProjects = useMemo(
    () => projects.filter((p) => p.project_type !== 'tool'),
    [projects],
  )

  const filteredProjects = useMemo(() => {
    let base = userProjects
    if (activeCategory) {
      base = base.filter((p) => p.category === activeCategory)
    }
    if (visibilityFilter === 'my') {
      return base.filter((p) => (p.visibility ?? 'organization') === 'private')
    }
    if (visibilityFilter === 'shared') {
      return base.filter((p) => (p.visibility ?? 'organization') !== 'private')
    }
    return base
  }, [userProjects, activeCategory, visibilityFilter])

  return (
    <>
      <div className="flex h-full flex-col">
        <Greeting name={userName} />

        <div className="flex items-center justify-between border-t border-border px-8 py-4">
          <div>
            <h2 className="text-sm font-semibold text-foreground">
              {activeCategory ?? 'All projects'}
            </h2>
            {userProjects.length > 0 && (
              <p className="text-xs text-muted-foreground mt-0.5 tabular-nums">
                {filteredProjects.length === userProjects.length
                  ? `${userProjects.length} project${userProjects.length !== 1 ? 's' : ''}`
                  : `${filteredProjects.length} of ${userProjects.length} project${userProjects.length !== 1 ? 's' : ''}`}
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

        <div className="flex-1 overflow-y-auto">
          {/* Tools section — always visible, no filters */}
          {!activeCategory && tools.length > 0 && (
            <section className="border-t border-border px-8 py-5">
              <div className="mb-3 flex items-center gap-2">
                <Wrench className="h-3.5 w-3.5 text-muted-foreground" aria-hidden />
                <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Tools
                </h3>
              </div>
              <div className="flex flex-wrap gap-2">
                {tools.map((tool) => (
                  <Link
                    key={tool.id}
                    href={`/dashboard/projects/${tool.id}`}
                    className={cn(
                      'flex items-center gap-2 rounded-lg border border-border bg-muted/30 px-4 py-2.5 text-sm font-medium text-foreground',
                      'hover:border-foreground/20 hover:bg-muted/60 transition-colors',
                    )}
                  >
                    {tool.name}
                  </Link>
                ))}
              </div>
            </section>
          )}

          {/* Projects section */}
          <section className="border-t border-border px-8 py-5">
            {userProjects.length > 0 && (
              <div className="mb-4 flex flex-wrap items-center gap-2">
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

            {userProjects.length === 0 ? (
              <div className="flex flex-col items-center gap-3 py-16 text-center">
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
              <div className="flex flex-col items-center gap-3 py-16 text-center">
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
                    projectType={project.project_type}
                    startDate={project.start_date}
                    estimatedEndDate={project.estimated_end_date}
                  />
                ))}
              </div>
            )}
          </section>
        </div>
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
