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

export function ProjectsList({ projects, userName }: ProjectsListProps) {
  const [dialogOpen, setDialogOpen] = useState(false)
  const [filterCategory, setFilterCategory] = useState<string | null>(null)

  const categories = Array.from(new Set(projects.map((p) => p.category).filter(Boolean))) as string[]

  const filtered = filterCategory ? projects.filter((p) => p.category === filterCategory) : projects

  const grouped = filterCategory
    ? { [filterCategory]: filtered }
    : filtered.reduce<Record<string, Project[]>>((acc, p) => {
        const key = p.category ?? 'Other'
        if (!acc[key]) acc[key] = []
        acc[key].push(p)
        return acc
      }, {})

  const hasCategories = categories.length > 0

  return (
    <>
      <div className="flex h-full flex-col">
        <Greeting name={userName} />

        <div className="flex items-center justify-between border-t border-border px-8 py-4">
          <div className="flex items-center gap-3">
            <h2 className="text-sm font-semibold text-foreground">Projects</h2>
            {hasCategories && (
              <div className="flex flex-wrap gap-1.5">
                <button
                  onClick={() => setFilterCategory(null)}
                  className={cn(
                    'rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors',
                    filterCategory === null ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/80',
                  )}
                >
                  All
                </button>
                {categories.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setFilterCategory(filterCategory === cat ? null : cat)}
                    className={cn(
                      'rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors',
                      filterCategory === cat ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/80',
                    )}
                  >
                    {cat}
                  </button>
                ))}
              </div>
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

        {projects.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
              <FolderOpen className="h-5 w-5 text-muted-foreground" />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium text-foreground">No projects yet</p>
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
        ) : (
          <div className="px-8 pb-8 space-y-8">
            {hasCategories ? (
              Object.entries(grouped).map(([cat, items]) => (
                <div key={cat}>
                  <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-muted-foreground/60">{cat}</p>
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
                </div>
              ))
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {filtered.map((project) => (
                  <ProjectCard
                    key={project.id}
                    id={project.id}
                    name={project.name}
                    description={project.description}
                    updatedAt={project.updated_at}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      <NewProjectDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
      />
    </>
  )
}
