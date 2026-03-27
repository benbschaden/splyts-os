'use client'

import { useState } from 'react'
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
}

interface ProjectsListProps {
  projects: Project[]
  userName: string
}

const KNOWN_CATEGORIES = [
  'Marketing',
  'Engineering',
  'Product',
  'Sales',
  'HR',
  'Operations',
  'Finance',
  'Design',
  'Legal',
  'Customer Success',
]

export function ProjectsList({ projects, userName }: ProjectsListProps) {
  const [dialogOpen, setDialogOpen] = useState(false)
  const [defaultCategory, setDefaultCategory] = useState<string | undefined>(undefined)

  // Collect any categories from projects that aren't in the known list
  const customCategories = Array.from(
    new Set(
      projects
        .map((p) => p.category)
        .filter((c): c is string => !!c && !KNOWN_CATEGORIES.includes(c)),
    ),
  )

  // All sections in order: known categories first, then any custom ones, then uncategorised
  const allSections: string[] = [...KNOWN_CATEGORIES, ...customCategories]
  const uncategorised = projects.filter((p) => !p.category)

  function openDialogForCategory(cat?: string) {
    setDefaultCategory(cat)
    setDialogOpen(true)
  }

  return (
    <>
      <div className="flex h-full flex-col">
        <Greeting name={userName} />

        <div className="flex items-center justify-between border-t border-border px-8 py-4">
          <h2 className="text-sm font-semibold text-foreground">Projects</h2>
          <button
            onClick={() => openDialogForCategory(undefined)}
            className={cn(
              'flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground',
              'hover:bg-primary/90 transition-colors',
            )}
          >
            <Plus className="h-3.5 w-3.5" />
            New project
          </button>
        </div>

        <div className="px-8 pb-8 space-y-8 overflow-y-auto">
          {allSections.map((cat) => {
            const items = projects.filter((p) => p.category === cat)
            return (
              <div key={cat}>
                <div className="mb-3 flex items-center justify-between">
                  <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground/60">
                    {cat}
                  </p>
                  <button
                    onClick={() => openDialogForCategory(cat)}
                    className="flex items-center gap-1 rounded px-1.5 py-0.5 text-xs text-muted-foreground/50 hover:text-muted-foreground hover:bg-accent transition-colors"
                    title={`New ${cat} project`}
                  >
                    <Plus className="h-3 w-3" />
                    Add
                  </button>
                </div>

                {items.length > 0 ? (
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {items.map((project) => (
                      <ProjectCard
                        key={project.id}
                        id={project.id}
                        name={project.name}
                        description={project.description}
                        updatedAt={project.updated_at}
                      />
                    ))}
                  </div>
                ) : (
                  <button
                    onClick={() => openDialogForCategory(cat)}
                    className="w-full rounded-lg border border-dashed border-border py-4 text-xs text-muted-foreground/40 hover:border-border/80 hover:text-muted-foreground/60 transition-colors"
                  >
                    No {cat.toLowerCase()} projects yet — click to add one
                  </button>
                )}
              </div>
            )
          })}

          {/* Uncategorised bucket — only shown if projects exist without a category */}
          {uncategorised.length > 0 && (
            <div>
              <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-muted-foreground/60">
                Other
              </p>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {uncategorised.map((project) => (
                  <ProjectCard
                    key={project.id}
                    id={project.id}
                    name={project.name}
                    description={project.description}
                    updatedAt={project.updated_at}
                  />
                ))}
              </div>
            </div>
          )}

          {projects.length === 0 && (
            <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
                <FolderOpen className="h-5 w-5 text-muted-foreground" />
              </div>
              <div className="space-y-1">
                <p className="text-sm font-medium text-foreground">No projects yet</p>
                <p className="text-sm text-muted-foreground">
                  Create your first project to get started
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      <NewProjectDialog
        open={dialogOpen}
        onClose={() => { setDialogOpen(false); setDefaultCategory(undefined) }}
        defaultCategory={defaultCategory}
      />
    </>
  )
}
