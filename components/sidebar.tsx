import Link from 'next/link'
import { FolderOpen, Building2, Settings, LogOut } from 'lucide-react'
import { cn } from '@/lib/utils'
import { NorthStarTrigger } from '@/components/company/north-star-trigger'

const navigation = [
  { name: 'Projects', href: '/dashboard', icon: FolderOpen },
  { name: 'Company', href: '/dashboard/company', icon: Building2 },
]

const bottomNavigation = [
  { name: 'Settings', href: '/dashboard/settings/profile', icon: Settings },
]

interface SidebarProps {
  orgName: string
  userName: string
  avatarUrl: string | null
  email: string
  isAdmin: boolean
  northStar?: string | null
  mission?: string | null
  vision?: string | null
}

export function Sidebar({ orgName, userName, avatarUrl, email, isAdmin, northStar, mission, vision }: SidebarProps) {
  const displayName = userName || email?.split('@')[0] || ''
  const initials = displayName?.[0]?.toUpperCase() ?? '?'

  return (
    <div className="flex h-screen w-60 flex-col border-r border-border bg-background">

      {/* Workspace */}
      <div className="flex h-12 items-center border-b border-border px-4">
        <Link
          href="/dashboard"
          className="text-sm font-semibold tracking-tight text-foreground hover:opacity-70 transition-opacity truncate"
        >
          {orgName}
        </Link>
      </div>

      {/* User */}
      <Link
        href="/dashboard/settings/profile"
        className="flex h-12 items-center gap-3 border-b border-border px-4 hover:bg-accent transition-colors group"
      >
        <div className="h-7 w-7 shrink-0 rounded-full overflow-hidden bg-muted flex items-center justify-center ring-1 ring-border group-hover:ring-foreground/20 transition-all">
          {avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={avatarUrl} alt={displayName} className="h-full w-full object-cover" />
          ) : (
            <span className="text-[11px] font-semibold text-muted-foreground">
              {initials}
            </span>
          )}
        </div>
        <span className="text-sm font-medium text-foreground truncate">
          {displayName}
        </span>
      </Link>

      {/* Main nav */}
      <nav className="flex flex-1 flex-col gap-0.5 p-3">
        {navigation.map((item) => (
          <Link
            key={item.name}
            href={item.href}
            className={cn(
              'flex items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors',
              'hover:bg-accent hover:text-accent-foreground',
            )}
          >
            <item.icon className="h-4 w-4 shrink-0" />
            {item.name}
          </Link>
        ))}
      </nav>

      {/* North star */}
      {northStar && mission && vision && (
        <div className="px-3 pb-2">
          <NorthStarTrigger
            northStar={northStar}
            mission={mission}
            vision={vision}
            companyName={orgName}
          />
        </div>
      )}

      {/* Bottom nav */}
      <div className="flex flex-col gap-0.5 border-t border-border p-3">
        {bottomNavigation.map((item) => (
          <Link
            key={item.name}
            href={item.href}
            className={cn(
              'flex items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors',
              'hover:bg-accent hover:text-accent-foreground',
            )}
          >
            <item.icon className="h-4 w-4 shrink-0" />
            {item.name}
          </Link>
        ))}
        <form action="/api/auth/signout" method="post">
          <button
            type="submit"
            className={cn(
              'flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors',
              'hover:bg-accent hover:text-accent-foreground',
            )}
          >
            <LogOut className="h-4 w-4 shrink-0" />
            Sign out
          </button>
        </form>
      </div>

    </div>
  )
}
