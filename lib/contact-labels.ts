/**
 * Canonical form for contact tags and acquisition_source:
 * lowercase, trim, spaces and underscores → hyphens, collapse repeats.
 * Use everywhere tags/sources are read or written so variants don't duplicate.
 */
export function normalizeContactLabel(raw: string): string {
  if (!raw || typeof raw !== 'string') return ''
  let s = raw.trim().toLowerCase()
  s = s.replace(/_/g, '-')
  s = s.replace(/\s+/g, '-')
  s = s.replace(/-+/g, '-')
  s = s.replace(/^-+|-+$/g, '')
  return s
}

/** Dedupe while preserving first-seen order. Drops empty strings after normalize. */
export function normalizeTagList(tags: string[]): string[] {
  const seen = new Set<string>()
  const out: string[] = []
  for (const t of tags) {
    const n = normalizeContactLabel(t)
    if (!n || seen.has(n)) continue
    seen.add(n)
    out.push(n)
  }
  return out
}
