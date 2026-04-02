'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { BarChart2, ChevronDown } from 'lucide-react'
import { useState } from 'react'

const BASE_ITEMS = [
  { name: 'Goals', href: '/dashboard/company/goals' },
  { name: 'KPIs & Metrics', href: '/dashboard/company/kpis' },
  { name: 'Milestones', href: '/dashboard/company/milestones' },
  { name: 'Risks', href: '/dashboard/company/risks' },
  { name: 'Competitors', href: '/dashboard/company/competitors' },
  { name: 'Funnels', href: '/dashboard/company/funnels' },
]

const OWNER_ITEMS = [
  { name: 'Reports', href: '/dashboard/performance/reports' },
]

interface PerformanceNavProps {
  isOwner?: boolean
}

export function PerformanceNav({ isOwner = false }: PerformanceNavProps) {
  const items = isOwner ? [...BASE_ITEMS, ...OWNER_ITEMS] : BASE_ITEMS
  const allPaths = items.map((i) => i.href)
  const pathname = usePathname()

  const isPerformance =
    pathname === '/dashboard/performance' ||
    allPaths.some((p) => pathname === p)

  const [open, setOpen] = useState(isPerformance)

  return (
    <div className="flex flex-col gap-0.5">
      <div className="flex items-center gap-0.5">
        <Link
          href="/dashboard/performance"
          className={cn(
            'flex min-w-0 flex-1 items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors',
            isPerformance && pathname === '/dashboard/performance'
              ? 'bg-accent text-accent-foreground'
              : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
          )}
        >
          <BarChart2 className="h-4 w-4 shrink-0" />
          <span className="min-w-0 flex-1 truncate">Performance</span>
        </Link>

        <button
          type="button"
          onClick={() => setOpen((p) => !p)}
          className="rounded-md p-1.5 text-muted-foreground/50 hover:bg-accent hover:text-muted-foreground transition-colors"
          aria-label={open ? 'Collapse performance' : 'Expand performance'}
        >
          <ChevronDown className={cn('h-3 w-3 transition-transform', open ? 'rotate-0' : '-rotate-90')} />
        </button>
      </div>

      {open && (
        <div className="flex flex-col gap-0.5 pl-4">
          {items.map((item) => {
            const isActive = pathname === item.href
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'min-w-0 truncate rounded-md px-3 py-1.5 text-sm transition-colors',
                  isActive
                    ? 'bg-accent text-accent-foreground font-medium'
                    : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
                )}
              >
                {item.name}
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
