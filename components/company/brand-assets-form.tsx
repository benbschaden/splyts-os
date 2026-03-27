'use client'

import { useEffect, useState } from 'react'
import { cn } from '@/lib/utils'
import type { BrandAssets } from '@/lib/queries/brand-context'

function emptyAssets(): BrandAssets {
  return {
    logo_url: '',
    logo_mark_url: '',
    primary_color: '',
    secondary_color: '',
    accent_color: '',
    font_display: '',
    font_body: '',
    image_style: '',
    social_handles: '',
  }
}

function mergeInitial(initial: BrandAssets): BrandAssets {
  return { ...emptyAssets(), ...initial }
}

/** Returns a CSS color string or null if the value is not a valid hex (3/6/8 digits, optional #). */
function hexToCssColor(input: string): string | null {
  const t = input.trim()
  if (!t) return null
  const s = t.startsWith('#') ? t : `#${t}`
  if (/^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6}|[0-9A-Fa-f]{8})$/.test(s)) {
    return s
  }
  return null
}

function isLikelyHttpUrl(url: string): boolean {
  const t = url.trim()
  if (!t) return false
  try {
    const u = new URL(t)
    return u.protocol === 'http:' || u.protocol === 'https:'
  } catch {
    return false
  }
}

interface BrandAssetsFormProps {
  initial: BrandAssets
  isAdmin: boolean
}

export function BrandAssetsForm({ initial, isAdmin }: BrandAssetsFormProps) {
  const [values, setValues] = useState<BrandAssets>(() => mergeInitial(initial))
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [serverError, setServerError] = useState<string | null>(null)

  useEffect(() => {
    setValues(mergeInitial(initial))
  }, [initial])

  function set<K extends keyof BrandAssets>(key: K, value: string) {
    setValues((prev) => ({ ...prev, [key]: value }))
    setSaved(false)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setServerError(null)
    setSaved(false)

    const res = await fetch('/api/brand-assets', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(values),
    })

    setSaving(false)

    if (!res.ok) {
      setServerError('Failed to save. Please try again.')
      return
    }

    setSaved(true)
  }

  const logoPreview = isLikelyHttpUrl(values.logo_url ?? '')
  const markPreview = isLikelyHttpUrl(values.logo_mark_url ?? '')

  return (
    <form onSubmit={handleSubmit} className="space-y-8 max-w-2xl">
      <section className="space-y-4">
        <div>
          <h2 className="text-sm font-semibold text-foreground">Logo</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Full logo and mark URLs for reference (HTTPS recommended).
          </p>
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <div className="space-y-1.5">
            <label htmlFor="logo_url" className="text-sm font-medium text-foreground">
              Logo URL
            </label>
            <div className="flex items-center gap-3">
              <input
                id="logo_url"
                type="text"
                inputMode="url"
                autoComplete="off"
                value={values.logo_url ?? ''}
                onChange={(e) => set('logo_url', e.target.value)}
                disabled={!isAdmin || saving}
                readOnly={!isAdmin}
                placeholder="https://…"
                className={cn(
                  'flex-1 min-w-0 rounded-md border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground',
                  'focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1',
                  'disabled:opacity-60 disabled:cursor-not-allowed',
                  'border-input',
                )}
              />
              {logoPreview && (
                <img
                  src={values.logo_url!.trim()}
                  alt=""
                  width={32}
                  height={32}
                  className="h-8 w-8 shrink-0 rounded-md border border-border object-contain bg-muted"
                />
              )}
            </div>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="logo_mark_url" className="text-sm font-medium text-foreground">
              Logo mark URL
            </label>
            <div className="flex items-center gap-3">
              <input
                id="logo_mark_url"
                type="text"
                inputMode="url"
                autoComplete="off"
                value={values.logo_mark_url ?? ''}
                onChange={(e) => set('logo_mark_url', e.target.value)}
                disabled={!isAdmin || saving}
                readOnly={!isAdmin}
                placeholder="https://…"
                className={cn(
                  'flex-1 min-w-0 rounded-md border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground',
                  'focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1',
                  'disabled:opacity-60 disabled:cursor-not-allowed',
                  'border-input',
                )}
              />
              {markPreview && (
                <img
                  src={values.logo_mark_url!.trim()}
                  alt=""
                  width={32}
                  height={32}
                  className="h-8 w-8 shrink-0 rounded-md border border-border object-contain bg-muted"
                />
              )}
            </div>
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <div>
          <h2 className="text-sm font-semibold text-foreground">Colors</h2>
          <p className="text-xs text-muted-foreground mt-0.5">Hex codes for primary palette.</p>
        </div>

        <div className="grid gap-5 sm:grid-cols-3">
          {(
            [
              ['primary_color', 'Primary'] as const,
              ['secondary_color', 'Secondary'] as const,
              ['accent_color', 'Accent'] as const,
            ] as const
          ).map(([key, label]) => {
            const raw = values[key] ?? ''
            const swatch = hexToCssColor(raw)
            return (
              <div key={key} className="space-y-1.5">
                <label htmlFor={key} className="text-sm font-medium text-foreground">
                  {label}
                </label>
                <div className="flex items-center gap-2">
                  <input
                    id={key}
                    type="text"
                    value={raw}
                    onChange={(e) => set(key, e.target.value)}
                    disabled={!isAdmin || saving}
                    readOnly={!isAdmin}
                    placeholder="#000000"
                    autoComplete="off"
                    className={cn(
                      'flex-1 min-w-0 rounded-md border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground font-mono',
                      'focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1',
                      'disabled:opacity-60 disabled:cursor-not-allowed',
                      'border-input',
                    )}
                  />
                  {swatch && (
                    <div
                      className="h-4 w-4 shrink-0 rounded-md border border-border shadow-sm"
                      style={{ backgroundColor: swatch }}
                      aria-hidden
                    />
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </section>

      <section className="space-y-4">
        <div>
          <h2 className="text-sm font-semibold text-foreground">Typography</h2>
          <p className="text-xs text-muted-foreground mt-0.5">Font families for display and body.</p>
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <div className="space-y-1.5">
            <label htmlFor="font_display" className="text-sm font-medium text-foreground">
              Display font
            </label>
            <input
              id="font_display"
              type="text"
              value={values.font_display ?? ''}
              onChange={(e) => set('font_display', e.target.value)}
              disabled={!isAdmin || saving}
              readOnly={!isAdmin}
              placeholder="e.g. DM Serif Display"
              className={cn(
                'w-full rounded-md border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground',
                'focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1',
                'disabled:opacity-60 disabled:cursor-not-allowed',
                'border-input',
              )}
            />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="font_body" className="text-sm font-medium text-foreground">
              Body font
            </label>
            <input
              id="font_body"
              type="text"
              value={values.font_body ?? ''}
              onChange={(e) => set('font_body', e.target.value)}
              disabled={!isAdmin || saving}
              readOnly={!isAdmin}
              placeholder="e.g. Inter"
              className={cn(
                'w-full rounded-md border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground',
                'focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1',
                'disabled:opacity-60 disabled:cursor-not-allowed',
                'border-input',
              )}
            />
          </div>
        </div>
      </section>

      <section className="space-y-1.5">
        <label htmlFor="image_style" className="text-sm font-medium text-foreground">
          Image style
        </label>
        <p className="text-xs text-muted-foreground">Direction for photography and visuals.</p>
        <textarea
          id="image_style"
          value={values.image_style ?? ''}
          onChange={(e) => set('image_style', e.target.value)}
          rows={3}
          disabled={!isAdmin || saving}
          readOnly={!isAdmin}
          placeholder="e.g. Bold lifestyle photography, no stock photos. High contrast. People in motion."
          className={cn(
            'w-full rounded-md border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground resize-none',
            'focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1',
            'disabled:opacity-60 disabled:cursor-not-allowed',
            'border-input',
          )}
        />
      </section>

      <section className="space-y-1.5">
        <label htmlFor="social_handles" className="text-sm font-medium text-foreground">
          Social handles
        </label>
        <p className="text-xs text-muted-foreground">Where the brand shows up online.</p>
        <textarea
          id="social_handles"
          value={values.social_handles ?? ''}
          onChange={(e) => set('social_handles', e.target.value)}
          rows={3}
          disabled={!isAdmin || saving}
          readOnly={!isAdmin}
          placeholder="e.g. LinkedIn: /company/splyts, Twitter: @splyts"
          className={cn(
            'w-full rounded-md border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground resize-none',
            'focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1',
            'disabled:opacity-60 disabled:cursor-not-allowed',
            'border-input',
          )}
        />
      </section>

      {serverError && <p className="text-sm text-destructive">{serverError}</p>}

      {isAdmin && (
        <div className="flex items-center gap-3 pt-1">
          <button
            type="submit"
            disabled={saving}
            className={cn(
              'rounded-md bg-primary px-5 py-2 text-sm font-medium text-primary-foreground',
              'hover:bg-primary/90 transition-colors',
              'disabled:opacity-50 disabled:cursor-not-allowed',
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
