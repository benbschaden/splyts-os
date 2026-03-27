'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'

const primaryNav = [{ name: 'Content', href: '/dashboard/company' }]

const configNav = [
  { name: 'Brand', href: '/dashboard/company/brand' },
  { name: 'Authors', href: '/dashboard/company/authors' },
  { name: 'Content types', href: '/dashboard/company/content-types' },
]

interface CompanyNavProps {
  isAdmin: boolean
}

export function CompanyNav({ isAdmin }: CompanyNavProps) {
  const pathname = usePathname()

  const isActive = (href: string) => {
    if (href === '/dashboard/company') return pathname === '/dashboard/company'
    return pathname.startsWith(href)
  }

  return (
    <nav className="flex flex-col gap-0.5">
      {primaryNav.map((item) => (
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

      {isAdmin && (
        <>
          <div className="my-2 border-t border-border" />
          <p className="px-3 pb-1 text-[11px] font-medium uppercase tracking-wider text-muted-foreground/60">
            Configure
          </p>
          {configNav.map((item) => (
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
        </>
      )}
    </nav>
  )
}
