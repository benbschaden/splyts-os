'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { Building2, ChevronDown } from 'lucide-react'
import { useState } from 'react'

const COMPANY_ITEMS = [
  { name: 'Business plan', href: '/dashboard/company/business-plan' },
  { name: 'Knowledge', href: '/dashboard/company/knowledge' },
  { name: 'Product', href: '/dashboard/company/product' },
  { name: 'Features', href: '/dashboard/company/features' },
  { name: 'Roadmap', href: '/dashboard/company/roadmap' },
  { name: 'Brand', href: '/dashboard/company/brand' },
  { name: 'Narratives', href: '/dashboard/company/narratives' },
  { name: 'Terminology', href: '/dashboard/company/terminology' },
  { name: 'Personas', href: '/dashboard/company/personas' },
  { name: 'Authors', href: '/dashboard/company/authors' },
  { name: 'Assets', href: '/dashboard/company/assets' },
  { name: 'Content types', href: '/dashboard/company/content-types' },
  { name: 'Social proof', href: '/dashboard/company/social-proof' },
  { name: 'Benchmarks', href: '/dashboard/company/benchmarks' },
  { name: 'Calendar', href: '/dashboard/company/calendar' },
]

const COMPANY_PATHS = COMPANY_ITEMS.map((i) => i.href)

export function CompanyNav() {
  const pathname = usePathname()

  const isCompany =
    pathname === '/dashboard/company' ||
    COMPANY_PATHS.some((p) => pathname === p)

  const [open, setOpen] = useState(isCompany)

  return (
    <div className="flex flex-col gap-0.5">
      <div className="flex items-center gap-0.5">
        <button
          type="button"
          onClick={() => setOpen((p) => !p)}
          className={cn(
            'flex min-w-0 flex-1 items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors',
            isCompany && !COMPANY_PATHS.some((p) => pathname === p) && pathname !== '/dashboard/company'
              ? 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
              : isCompany
                ? 'text-foreground hover:bg-accent'
                : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
          )}
        >
          <Building2 className="h-4 w-4 shrink-0" />
          <span className="min-w-0 flex-1 truncate text-left">Company</span>
          <ChevronDown className={cn('h-3 w-3 shrink-0 text-muted-foreground/50 transition-transform', open ? 'rotate-0' : '-rotate-90')} />
        </button>
      </div>

      {open && (
        <div className="flex flex-col gap-0.5 pl-4">
          {COMPANY_ITEMS.map((item) => {
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
