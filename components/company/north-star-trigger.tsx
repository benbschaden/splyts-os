'use client'

import { useState } from 'react'
import { NorthStarOverlay } from '@/components/company/north-star-overlay'

interface NorthStarTriggerProps {
  northStar: string
  mission: string
  vision: string
  companyName: string
}

export function NorthStarTrigger({
  northStar,
  mission,
  vision,
  companyName,
}: NorthStarTriggerProps) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="w-full group text-left px-3 py-3 rounded-md hover:bg-accent transition-colors"
        aria-label="View company north star"
      >
        <p className="text-[9px] font-semibold uppercase tracking-[0.18em] text-muted-foreground/50 mb-1.5 group-hover:text-muted-foreground/70 transition-colors">
          North star
        </p>
        <p className="text-xs text-muted-foreground leading-snug line-clamp-2 group-hover:text-foreground transition-colors">
          {northStar}
        </p>
      </button>

      {open && (
        <NorthStarOverlay
          northStar={northStar}
          mission={mission}
          vision={vision}
          companyName={companyName}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  )
}
