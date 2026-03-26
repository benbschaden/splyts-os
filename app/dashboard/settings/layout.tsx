import Link from 'next/link'
import { cn } from '@/lib/utils'

const tabs = [
  { name: 'Profile', href: '/dashboard/settings/profile' },
  { name: 'Brand', href: '/dashboard/settings/brand' },
  { name: 'Authors', href: '/dashboard/settings/authors' },
  { name: 'Content Types', href: '/dashboard/settings/content-types' },
]

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-full flex-col">
      <div className="flex h-14 items-center border-b border-border px-6">
        <h1 className="text-sm font-semibold text-foreground">Settings</h1>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Settings sub-nav */}
        <aside className="w-48 shrink-0 border-r border-border p-3">
          <nav className="flex flex-col gap-0.5">
            {tabs.map((tab) => (
              <Link
                key={tab.href}
                href={tab.href}
                className={cn(
                  'rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors',
                  'hover:bg-accent hover:text-accent-foreground',
                )}
              >
                {tab.name}
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
