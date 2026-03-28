'use client'

import type { DiscussionRow } from '@/lib/queries/discussions'

export function DiscussionDetail(_props: {
  discussion: DiscussionRow
  organizationId: string
  onUpdated: (d: DiscussionRow) => void
}) {
  return (
    <div className="flex h-full items-center justify-center">
      <p className="text-sm text-muted-foreground">Loading…</p>
    </div>
  )
}
