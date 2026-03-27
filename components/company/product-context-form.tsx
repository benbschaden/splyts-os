'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils'
import { PRODUCT_SECTIONS, type ProductSections } from '@/lib/company/product-sections'

interface ProductContextFormProps {
  initial: ProductSections | null
  isAdmin: boolean
}

export function ProductContextForm({ initial, isAdmin }: ProductContextFormProps) {
  const [values, setValues] = useState<ProductSections>({ ...(initial ?? {}) })
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function set(key: string, value: string) {
    setValues((prev) => ({ ...prev, [key]: value }))
    setSaved(false)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError(null)
    setSaved(false)

    const res = await fetch('/api/product-context', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sections: values }),
    })

    setSaving(false)

    if (!res.ok) {
      setError('Failed to save. Please try again.')
      return
    }

    setSaved(true)
  }

  const aiVisible = PRODUCT_SECTIONS.filter((s) => s.aiVisibleByDefault)
  const notVisible = PRODUCT_SECTIONS.filter((s) => !s.aiVisibleByDefault)

  return (
    <form onSubmit={handleSubmit} className="space-y-8 max-w-2xl">
      <div className="space-y-1">
        <h2 className="text-sm font-semibold text-foreground">Product context</h2>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Describe your product in full detail. AI-visible sections are injected into every generation and chat with product context enabled.
        </p>
      </div>

      <div className="space-y-6">
        <p className="text-[11px] font-semibold uppercase tracking-widest text-blue-500">AI context (always injected)</p>
        <div className="space-y-5">
          {aiVisible.map((section) => (
            <div key={section.key} className="space-y-1.5">
              <label htmlFor={section.key} className="text-sm font-medium text-foreground">
                {section.label}
              </label>
              <p className="text-xs text-muted-foreground">{section.description}</p>
              <textarea
                id={section.key}
                value={values[section.key] ?? ''}
                onChange={(e) => set(section.key, e.target.value)}
                rows={3}
                disabled={!isAdmin || saving}
                readOnly={!isAdmin}
                placeholder={section.placeholder}
                className={cn(
                  'w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/60 resize-none',
                  'focus:outline-none focus:ring-2 focus:ring-ring',
                  'disabled:opacity-60 disabled:cursor-not-allowed',
                )}
              />
            </div>
          ))}
        </div>
      </div>

      <div className="border-t border-border pt-6 space-y-6">
        <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground/60">Internal reference (not in AI context)</p>
        <div className="space-y-5">
          {notVisible.map((section) => (
            <div key={section.key} className="space-y-1.5">
              <label htmlFor={section.key} className="text-sm font-medium text-foreground">
                {section.label}
              </label>
              <p className="text-xs text-muted-foreground">{section.description}</p>
              <textarea
                id={section.key}
                value={values[section.key] ?? ''}
                onChange={(e) => set(section.key, e.target.value)}
                rows={3}
                disabled={!isAdmin || saving}
                readOnly={!isAdmin}
                placeholder={section.placeholder}
                className={cn(
                  'w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/60 resize-none',
                  'focus:outline-none focus:ring-2 focus:ring-ring',
                  'disabled:opacity-60 disabled:cursor-not-allowed',
                )}
              />
            </div>
          ))}
        </div>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      {isAdmin && (
        <div className="flex items-center gap-3 pt-1">
          <button
            type="submit"
            disabled={saving}
            className={cn(
              'rounded-md bg-primary px-5 py-2 text-sm font-medium text-primary-foreground',
              'hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed',
            )}
          >
            {saving ? 'Saving…' : 'Save'}
          </button>
          {saved && <span className="text-sm text-muted-foreground">Saved</span>}
        </div>
      )}
    </form>
  )
}
