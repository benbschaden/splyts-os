'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'

const overviewHref = '/dashboard/company'

const strategyNav = [
  { name: 'Business plan', href: '/dashboard/company/business-plan' },
  { name: 'Personas', href: '/dashboard/company/personas' },
]

const brandingNav = [
  { name: 'Brand context', href: '/dashboard/company/brand' },
  { name: 'Authors', href: '/dashboard/company/authors' },
  { name: 'Content types', href: '/dashboard/company/content-types' },
]

interface CompanyNavProps {
  isAdmin: boolean
}

export function CompanyNav({ isAdmin }: CompanyNavProps) {
  const pathname = usePathname()

  const isOverview = pathname === overviewHref

  const isBrandingActive = (href: string) =>
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

      {isAdmin && (
        <>
          <div className="my-2 border-t border-border pt-1" />
          <p className="px-3 pb-1 pt-1 text-[11px] font-medium uppercase tracking-wider text-muted-foreground/60">
            Strategy
          </p>
          {strategyNav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'rounded-md px-3 py-2 text-sm font-medium transition-colors',
                isBrandingActive(item.href)
                  ? 'bg-accent text-accent-foreground'
                  : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
              )}
            >
              {item.name}
            </Link>
          ))}

          <div className="my-2 border-t border-border pt-1" />
          <p className="px-3 pb-1 pt-1 text-[11px] font-medium uppercase tracking-wider text-muted-foreground/60">
            Branding
          </p>
          {brandingNav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'rounded-md px-3 py-2 text-sm font-medium transition-colors',
                isBrandingActive(item.href)
                  ? 'bg-accent text-accent-foreground'
                  : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
              )}
            >
              {item.name}
            </Link>
          ))}
        </>
      )}
    </nav>
  )
}
