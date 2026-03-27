'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname, useSearchParams } from 'next/navigation'
import { ChevronDown, FolderOpen } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ProjectsNavProps {
  categories: string[]
}

export function ProjectsNav({ categories }: ProjectsNavProps) {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const activeCategory = searchParams.get('category')

  const isProjects = pathname === '/dashboard/projects'
  const [open, setOpen] = useState(true)

  return (
    <div>
      {/* Projects root link + expand toggle */}
      <div className="flex items-center gap-0.5">
        <Link
          href="/dashboard/projects"
          className={cn(
            'flex flex-1 items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium transition-colors',
            isProjects && !activeCategory
              ? 'bg-accent text-accent-foreground'
              : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
          )}
        >
          <FolderOpen className="h-4 w-4 shrink-0" />
          Projects
        </Link>

        {categories.length > 0 && (
          <button
            onClick={() => setOpen((p) => !p)}
            className="rounded-md p-1.5 text-muted-foreground/50 hover:bg-accent hover:text-muted-foreground transition-colors"
            aria-label={open ? 'Collapse categories' : 'Expand categories'}
          >
            <ChevronDown className={cn(
              'h-3 w-3 transition-transform',
              open ? 'rotate-0' : '-rotate-90',
            )} />
          </button>
        )}
      </div>

      {/* Category sub-items */}
      {open && categories.length > 0 && (
        <div className="mt-0.5 flex flex-col gap-0.5 pl-4">
          {categories.map((cat) => {
            const isActive = isProjects && activeCategory === cat
            return (
              <Link
                key={cat}
                href={`/dashboard/projects?category=${encodeURIComponent(cat)}`}
                className={cn(
                  'rounded-md px-3 py-1.5 text-sm transition-colors',
                  isActive
                    ? 'bg-accent text-accent-foreground font-medium'
                    : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
                )}
              >
                {cat}
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
