import Link from 'next/link'

interface CompanyOverviewProps {
  isAdmin: boolean
}

export function CompanyOverview({ isAdmin }: CompanyOverviewProps) {
  return (
    <div className="max-w-xl space-y-8">
      <div className="space-y-2">
        <h2 className="text-sm font-semibold text-foreground">Company knowledge</h2>
        <p className="text-sm text-muted-foreground leading-relaxed">
          This area holds what the operating system knows about your organisation — brand, plans,
          people, policies, and more as you add them. It is the foundation for consistent AI output,
          search, and workflows across projects.
        </p>
      </div>

      {isAdmin ? (
        <div className="space-y-3">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground/70">
            Branding
          </p>
          <p className="text-sm text-muted-foreground">
            Voice, authors, and content templates used when generating marketing and comms.
          </p>
          <ul className="flex flex-col gap-2">
            <li>
              <Link
                href="/dashboard/company/brand"
                className="text-sm font-medium text-foreground underline-offset-4 hover:underline"
              >
                Brand context
              </Link>
              <span className="text-sm text-muted-foreground"> — mission, voice, audience, pillars</span>
            </li>
            <li>
              <Link
                href="/dashboard/company/authors"
                className="text-sm font-medium text-foreground underline-offset-4 hover:underline"
              >
                Authors
              </Link>
              <span className="text-sm text-muted-foreground"> — named voices for generation</span>
            </li>
            <li>
              <Link
                href="/dashboard/company/content-types"
                className="text-sm font-medium text-foreground underline-offset-4 hover:underline"
              >
                Content types
              </Link>
              <span className="text-sm text-muted-foreground"> — templates and rules per format</span>
            </li>
          </ul>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">
          Admins configure company knowledge here. Generated content lives in{' '}
          <Link href="/dashboard" className="font-medium text-foreground underline-offset-4 hover:underline">
            Projects
          </Link>
          .
        </p>
      )}

      <div className="rounded-lg border border-dashed border-border bg-muted/20 px-4 py-3">
        <p className="text-xs font-medium text-muted-foreground leading-relaxed">
          More categories will appear here — e.g. business plan, roadmap, HR docs — so the OS can
          reason with your full company context.
        </p>
      </div>
    </div>
  )
}
