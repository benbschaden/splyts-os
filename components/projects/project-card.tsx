import Link from 'next/link'
import { formatDistanceToNow } from 'date-fns'
import { Globe, Lock, Users, UserCheck } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ProjectCardProps {
  id: string
  name: string
  description: string | null
  updatedAt: string
  visibility?: string | null
  status?: string | null
  tags?: string[] | null
}

const VISIBILITY_ICONS: Record<string, { icon: typeof Globe; label: string }> = {
  organization: { icon: Globe, label: 'Whole company' },
  team: { icon: Users, label: 'Team' },
  specific_users: { icon: UserCheck, label: 'Specific people' },
  private: { icon: Lock, label: 'Private' },
}

export function ProjectCard({
  id,
  name,
  description,
  updatedAt,
  visibility,
  status,
  tags,
}: ProjectCardProps) {
  const tagList = tags?.filter(Boolean) ?? []
  const isArchived = status === 'archived'
  const visibilityKey = visibility ?? 'organization'
  const visInfo = VISIBILITY_ICONS[visibilityKey] ?? VISIBILITY_ICONS.organization
  const VisIcon = visInfo.icon
  const showVisIcon = visibilityKey !== 'organization'

  return (
    <Link
      href={`/dashboard/projects/${id}`}
      className="group flex flex-col gap-2 rounded-lg border border-border bg-background p-5 transition-all hover:border-foreground/20 hover:shadow-sm"
    >
      <div className="flex items-start justify-between gap-2 min-w-0">
        <div className="flex items-start gap-1.5 min-w-0 flex-1">
          {showVisIcon && (
            <VisIcon
              className="h-3.5 w-3.5 shrink-0 mt-0.5 text-muted-foreground"
              aria-label={visInfo.label}
            />
          )}
          <h3 className="text-sm font-semibold text-foreground leading-snug group-hover:text-primary transition-colors line-clamp-2">
            {name}
          </h3>
        </div>
        {isArchived && (
          <span
            className={cn(
              'shrink-0 rounded-md border border-border bg-muted/50 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground',
            )}
          >
            Archived
          </span>
        )}
      </div>

      {description && (
        <p className="text-sm text-muted-foreground line-clamp-2 leading-relaxed">
          {description}
        </p>
      )}

      {tagList.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {tagList.map((tag) => (
            <span
              key={tag}
              className="rounded-md border border-border bg-muted/30 px-1.5 py-0.5 text-[11px] text-muted-foreground"
            >
              {tag}
            </span>
          ))}
        </div>
      )}

      <p className="mt-auto pt-1 text-xs text-muted-foreground/60">
        Updated {formatDistanceToNow(new Date(updatedAt), { addSuffix: true })}
      </p>
    </Link>
  )
}
