import Link from 'next/link'

interface AccessDeniedProps {
  message?: string
  backHref?: string
  backLabel?: string
}

export function AccessDenied({
  message = 'You do not have permission to view this page.',
  backHref,
  backLabel,
}: AccessDeniedProps) {
  return (
    <div className="flex flex-col items-center justify-center py-24 gap-3 text-center">
      <p className="text-sm font-medium text-foreground">{message}</p>
      {backHref && backLabel && (
        <Link
          href={backHref}
          className="text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          ← {backLabel}
        </Link>
      )}
    </div>
  )
}
