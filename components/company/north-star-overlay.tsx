'use client'

import { useEffect } from 'react'
import { X } from 'lucide-react'

interface NorthStarOverlayProps {
  northStar: string
  mission: string
  vision: string
  companyName: string
  onClose: () => void
}

export function NorthStarOverlay({
  northStar,
  mission,
  vision,
  companyName,
  onClose,
}: NorthStarOverlayProps) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      role="dialog"
      aria-modal="true"
      aria-label="Company north star"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-background/80 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Panel */}
      <div className="relative w-full max-w-lg mx-4 rounded-2xl border border-border bg-background shadow-2xl overflow-hidden">
        {/* Close */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
          aria-label="Close"
        >
          <X className="h-4 w-4" />
        </button>

        {/* North star hero */}
        <div className="px-8 pt-10 pb-8 border-b border-border">
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground/70 mb-4">
            North star
          </p>
          <p className="text-2xl font-semibold leading-snug tracking-tight text-foreground">
            {northStar}
          </p>
        </div>

        {/* Mission + Vision */}
        <div className="grid grid-cols-2 divide-x divide-border">
          <div className="px-6 py-6">
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground/70 mb-2">
              Mission
            </p>
            <p className="text-sm text-foreground leading-relaxed">{mission}</p>
          </div>
          <div className="px-6 py-6">
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground/70 mb-2">
              Vision
            </p>
            <p className="text-sm text-foreground leading-relaxed">{vision}</p>
          </div>
        </div>

        {/* Footer */}
        <div className="px-8 py-3 bg-muted/30 border-t border-border">
          <p className="text-[11px] text-muted-foreground/60 tracking-wide">{companyName}</p>
        </div>
      </div>
    </div>
  )
}
