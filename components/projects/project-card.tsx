import Link from 'next/link'
import { formatDistanceToNow } from 'date-fns'

interface ProjectCardProps {
  id: string
  name: string
  description: string | null
  updatedAt: string
}

export function ProjectCard({ id, name, description, updatedAt }: ProjectCardProps) {
  return (
    <Link
      href={`/dashboard/projects/${id}`}
      className="group flex flex-col gap-2 rounded-lg border border-border bg-background p-5 transition-all hover:border-foreground/20 hover:shadow-sm"
    >
      <div className="flex items-start justify-between gap-3">
        <h3 className="text-sm font-semibold text-foreground leading-snug group-hover:text-primary transition-colors line-clamp-2">
          {name}
        </h3>
      </div>

      {description && (
        <p className="text-sm text-muted-foreground line-clamp-2 leading-relaxed">
          {description}
        </p>
      )}

      <p className="mt-auto pt-1 text-xs text-muted-foreground/60">
        Updated {formatDistanceToNow(new Date(updatedAt), { addSuffix: true })}
      </p>
    </Link>
  )
}
