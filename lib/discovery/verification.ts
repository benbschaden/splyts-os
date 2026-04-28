/**
 * Verifies that LLM-returned quotes actually exist verbatim inside the chunk
 * they were extracted from.
 *
 * This is the anti-hallucination muscle of the discovery pipeline. Any quote
 * the verifier cannot locate in its source chunk is dropped before reaching
 * the user.
 *
 * Match strategy (in order of preference):
 *   1. Direct case-sensitive substring match.
 *   2. Whitespace-normalised match (collapse runs of whitespace to a single
 *      space; trim). The returned offsets are mapped back to the original
 *      chunk text.
 *
 * Anything looser than (2) is rejected — we will not perform fuzzy or
 * paraphrase-tolerant matching, by design.
 */

export interface VerifiedSpan {
  /** The exact verbatim text from the chunk (may differ in whitespace from the
   *  raw LLM output if it was matched via normalisation). */
  text: string
  /** Offset within the chunk text (0-based). */
  start: number
  /** Exclusive end offset within the chunk text. */
  end: number
}

/**
 * Attempts to verify a quote against the chunk text.
 * Returns the matched span (with offsets in the **chunk** text) or null.
 */
export function verifyQuote(chunkText: string, quote: string): VerifiedSpan | null {
  if (!quote || quote.trim().length === 0) return null

  // 1. Direct match.
  const direct = chunkText.indexOf(quote)
  if (direct !== -1) {
    return { text: quote, start: direct, end: direct + quote.length }
  }

  // 2. Whitespace-normalised match.
  const norm = buildNormalisedView(chunkText)
  const normQuote = normaliseWhitespace(quote).trim()
  if (normQuote.length === 0) return null

  const idx = norm.normalised.indexOf(normQuote)
  if (idx === -1) return null

  const startOriginal = norm.originalIndexAt(idx)
  const endOriginal = norm.originalIndexAt(idx + normQuote.length - 1) + 1
  if (startOriginal < 0 || endOriginal > chunkText.length || endOriginal <= startOriginal) {
    return null
  }
  return {
    text: chunkText.slice(startOriginal, endOriginal),
    start: startOriginal,
    end: endOriginal,
  }
}

/** Collapse runs of whitespace into a single space. Does not trim. */
export function normaliseWhitespace(s: string): string {
  return s.replace(/\s+/g, ' ')
}

interface NormalisedView {
  normalised: string
  /** Maps an index in the normalised string back to the original string. */
  originalIndexAt: (i: number) => number
}

/**
 * Builds a parallel index between the original text and a whitespace-collapsed
 * version of it. Each character in the normalised string knows the original
 * index it came from; runs of whitespace map to the index of the first
 * whitespace character of the run.
 */
function buildNormalisedView(input: string): NormalisedView {
  const normChars: string[] = []
  const map: number[] = []
  let lastWasSpace = false

  for (let i = 0; i < input.length; i += 1) {
    const ch = input[i]
    if (/\s/.test(ch)) {
      if (lastWasSpace) continue
      normChars.push(' ')
      map.push(i)
      lastWasSpace = true
    } else {
      normChars.push(ch)
      map.push(i)
      lastWasSpace = false
    }
  }

  return {
    normalised: normChars.join(''),
    originalIndexAt: (i: number) => (i >= 0 && i < map.length ? map[i] : -1),
  }
}

/**
 * Bulk verifies a list of quoted findings against a chunk's text.
 * Returns the kept items (with verified spans) and the count dropped.
 */
export function verifyQuoteList<T extends { quote: string }>(
  chunkText: string,
  items: T[],
): {
  kept: Array<T & { verified: VerifiedSpan }>
  dropped: number
} {
  const kept: Array<T & { verified: VerifiedSpan }> = []
  let dropped = 0
  for (const item of items) {
    const span = verifyQuote(chunkText, item.quote)
    if (span) {
      kept.push({ ...item, verified: span })
    } else {
      dropped += 1
    }
  }
  return { kept, dropped }
}
