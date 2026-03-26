import Link from 'next/link'
import { FolderOpen, Settings, LogOut } from 'lucide-react'
import { cn } from '@/lib/utils'

const navigation = [
  { name: 'Projects', href: '/dashboard', icon: FolderOpen },
]

const bottomNavigation = [
  { name: 'Settings', href: '/dashboard/settings', icon: Settings },
]

interface SidebarProps {
  orgName: string
  userName: string
  avatarUrl: string | null
  email: string
}

export function Sidebar({ orgName, userName, avatarUrl, email }: SidebarProps) {
  const initials = userName?.[0]?.toUpperCase() ?? email?.[0]?.toUpperCase() ?? '?'

  return (
    <div className="flex h-screen w-60 flex-col border-r border-border bg-background">
      <div className="flex h-14 items-center justify-between border-b border-border px-4">
        <Link
          href="/dashboard"
          className="text-sm font-semibold tracking-tight text-foreground hover:opacity-70 transition-opacity truncate"
        >
          {orgName}
        </Link>
        <Link href="/dashboard/settings/profile" className="shrink-0 ml-2">
          <div className="h-7 w-7 rounded-full overflow-hidden bg-muted flex items-center justify-center ring-1 ring-border hover:ring-foreground/30 transition-all">
            {avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={avatarUrl} alt={userName} className="h-full w-full object-cover" />
            ) : (
              <span className="text-[11px] font-semibold text-muted-foreground">{initials}</span>
            )}
          </div>
        </Link>
      </div>

      <nav className="flex flex-1 flex-col gap-1 p-3">
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

      <div className="flex flex-col gap-1 border-t border-border p-3">
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
