'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
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
      { name: 'Platform guidelines', href: '/dashboard/company/platforms' },
      { name: 'Calendar', href: '/dashboard/company/calendar' },
    ],
  },
]

export function CompanyNav() {
  const pathname = usePathname()

  const isOverview = pathname === overviewHref

  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(`${href}/`)

  return (
    <nav className="flex flex-col gap-1">
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

      {navGroups.map((group) => (
        <div key={group.label}>
          <div className="my-2 border-t border-border pt-1" />
          <p className="px-3 pb-1 pt-1 text-[11px] font-medium uppercase tracking-wider text-muted-foreground/60">
            {group.label}
          </p>
          {group.items.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'rounded-md px-3 py-2 text-sm font-medium transition-colors',
                isActive(item.href)
                  ? 'bg-accent text-accent-foreground'
                  : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
              )}
            >
              {item.name}
            </Link>
          ))}
        </div>
      ))}
    </nav>
  )
}
