'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'

const overviewHref = '/dashboard/company'

const navGroups = [
  {
    label: 'Strategy',
    items: [
      { name: 'Business plan', href: '/dashboard/company/business-plan' },
      { name: 'Goals', href: '/dashboard/company/goals' },
      { name: 'Milestones', href: '/dashboard/company/milestones' },
    ],
  },
  {
    label: 'Product',
    items: [
      { name: 'Product context', href: '/dashboard/company/product' },
      { name: 'Features', href: '/dashboard/company/features' },
      { name: 'Roadmap', href: '/dashboard/company/roadmap' },
    ],
  },
  {
    label: 'Branding',
    items: [
      { name: 'Brand context', href: '/dashboard/company/brand' },
      { name: 'Personas', href: '/dashboard/company/personas' },
      { name: 'Authors', href: '/dashboard/company/authors' },
    ],
  },
  {
    label: 'Content',
    items: [
      { name: 'Content types', href: '/dashboard/company/content-types' },
      { name: 'Calendar', href: '/dashboard/company/calendar' },
    ],
  },
]

export function CompanyNav() {
  const pathname = usePathname()

  const isOverview = pathname === overviewHref

  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(`${href}/`)

  // Default all groups open; collapse any group that has no active item
  const initialCollapsed = Object.fromEntries(navGroups.map((g) => [g.label, false]))
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>(initialCollapsed)

  function toggle(label: string) {
    setCollapsed((prev) => ({ ...prev, [label]: !prev[label] }))
  }

  return (
    <nav className="flex flex-col gap-0.5">
      <Link
        href={overviewHref}
        className={cn(
          'rounded-md px-3 py-2 text-sm font-medium transition-colors',
          isOverview
            ? 'bg-accent text-accent-foreground'
            : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
        )}
      >
        Overview
      </Link>

      {navGroups.map((group) => {
        const isOpen = !collapsed[group.label]
        const hasActive = group.items.some((i) => isActive(i.href))

        return (
          <div key={group.label} className="mt-3">
            {/* Section header — clickable to collapse */}
            <button
              onClick={() => toggle(group.label)}
              className="flex w-full items-center justify-between px-3 pb-1 group"
            >
              <span className={cn(
                'text-[11px] font-semibold uppercase tracking-wider transition-colors',
                hasActive ? 'text-foreground' : 'text-muted-foreground/60 group-hover:text-muted-foreground',
              )}>
                {group.label}
              </span>
              <ChevronDown className={cn(
                'h-3 w-3 text-muted-foreground/40 transition-transform group-hover:text-muted-foreground',
                isOpen ? 'rotate-0' : '-rotate-90',
              )} />
            </button>

            {/* Items — each on its own row */}
            {isOpen && (
              <div className="flex flex-col gap-0.5 mt-0.5">
                {group.items.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      'rounded-md px-3 py-1.5 text-sm transition-colors',
                      isActive(item.href)
                        ? 'bg-accent text-accent-foreground font-medium'
                        : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
                    )}
                  >
                    {item.name}
                  </Link>
                ))}
              </div>
            )}
          </div>
        )
      })}
    </nav>
  )
}
