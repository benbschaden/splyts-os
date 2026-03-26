'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'

const primaryNav = [
  { name: 'Content', href: '/dashboard/marketing' },
]

const configNav = [
  { name: 'Brand', href: '/dashboard/marketing/brand' },
  { name: 'Authors', href: '/dashboard/marketing/authors' },
  { name: 'Content Types', href: '/dashboard/marketing/content-types' },
]

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()

  const isActive = (href: string) => {
    if (href === '/dashboard/marketing') return pathname === '/dashboard/marketing'
    return pathname.startsWith(href)
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex h-14 items-center border-b border-border px-6">
        <h1 className="text-sm font-semibold text-foreground">Marketing</h1>
      </div>

      <div className="flex flex-1 overflow-hidden">
        <aside className="w-48 shrink-0 border-r border-border p-3">
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
          </nav>
        </aside>

        <div className="flex-1 overflow-y-auto p-6">
          {children}
        </div>
      </div>
    </div>
  )
}
