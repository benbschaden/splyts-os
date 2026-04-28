/**
 * Deterministic transcript chunker for the discovery analysis pipeline.
 *
 * Splits a long `raw_content` string into overlapping chunks suitable for
 * per-chunk LLM extraction. The chunker is purely textual — no AI calls.
 *
 * Boundary preference (best to worst): paragraph break (\n\n) → line break (\n)
 * → sentence end (. ! ?) → hard cut.
 *
 * Hard guarantees:
 *  - Every character of the input text appears in at least one returned chunk.
 *  - Chunks are returned in order with monotonically increasing `start` and `end`.
 *  - Each chunk's text matches `text.slice(chunk.start, chunk.end)`.
 *  - For a non-empty input, at least one chunk is returned.
 */

export interface DiscoveryChunk {
  index: number
  start: number
  end: number
  text: string
}

export const DEFAULT_TARGET_CHUNK_CHARS = 12_000
export const DEFAULT_OVERLAP_CHARS = 1_000

export interface ChunkingOptions {
  targetSize?: number
  overlap?: number
}

/**
 * Normalises line endings before chunking so offsets are stable.
 */
export function normaliseTranscript(input: string): string {
  return input.replace(/\r\n/g, '\n').replace(/\r/g, '\n')
}

/**
 * Splits `text` into overlapping chunks. See module-level doc for boundary rules.
 */
export function chunkTranscript(
  text: string,
  options: ChunkingOptions = {},
): DiscoveryChunk[] {
  const targetSize = Math.max(500, options.targetSize ?? DEFAULT_TARGET_CHUNK_CHARS)
  const overlap = Math.max(0, Math.min(options.overlap ?? DEFAULT_OVERLAP_CHARS, Math.floor(targetSize / 2)))

  if (text.length === 0) return []
  if (text.length <= targetSize) {
    return [{ index: 0, start: 0, end: text.length, text }]
  }

  const chunks: DiscoveryChunk[] = []
  let cursor = 0
  let index = 0

  while (cursor < text.length) {
    const nominalEnd = Math.min(cursor + targetSize, text.length)
    let end = nominalEnd

    if (nominalEnd < text.length) {
      // Search for a clean boundary in the last `overlap` characters of the window.
      const searchStart = Math.max(cursor + Math.floor(targetSize / 2), nominalEnd - overlap)
      const boundary = findBestBoundary(text, searchStart, nominalEnd)
      if (boundary > cursor) end = boundary
    }

    chunks.push({ index, start: cursor, end, text: text.slice(cursor, end) })
    index += 1

    if (end >= text.length) break

    // Next chunk starts `overlap` characters before the previous end so a
    // sentence sitting on the boundary remains visible to both chunks.
    let nextCursor = Math.max(end - overlap, cursor + 1)
    if (nextCursor <= cursor) {
      // Safety net: guarantee forward progress.
      nextCursor = cursor + Math.max(1, targetSize - overlap)
    }
    cursor = nextCursor
  }

  return chunks
}

/**
 * Returns an index in [searchStart, hardEnd] where it is good to split, or
 * `hardEnd` if no clean boundary is found.
 *
 * The returned index is the position **after** the boundary character(s),
 * so `text.slice(start, returnedIndex)` yields a chunk that ends with that
 * boundary text.
 */
function findBestBoundary(text: string, searchStart: number, hardEnd: number): number {
  if (searchStart >= hardEnd) return hardEnd
  const window = text.slice(searchStart, hardEnd)

  const paragraph = window.lastIndexOf('\n\n')
  if (paragraph !== -1) return searchStart + paragraph + 2

  const newline = window.lastIndexOf('\n')
  if (newline !== -1) return searchStart + newline + 1

  // Sentence boundary: last occurrence of `. `, `! `, or `? ` (or with closing quote).
  const sentenceMatch = lastSentenceEnd(window)
  if (sentenceMatch !== -1) return searchStart + sentenceMatch

  return hardEnd
}

/**
 * Returns the index just after the last sentence-ending punctuation in `s`,
 * or -1 if no plausible sentence end exists.
 *
 * Treats `. `, `! `, `? `, and the same followed by `"`, `'`, or `)` as ends.
 */
function lastSentenceEnd(s: string): number {
  let best = -1
  for (let i = s.length - 1; i >= 1; i -= 1) {
    const ch = s[i]
    if (ch !== ' ' && ch !== '\t') continue
    // Walk back across closing punctuation if present.
    let j = i - 1
    while (j > 0 && (s[j] === '"' || s[j] === "'" || s[j] === ')' || s[j] === ']')) j -= 1
    const c = s[j]
    if (c === '.' || c === '!' || c === '?') {
      best = i + 1
      break
    }
  }
  return best
}

/**
 * SHA-256 hex digest of a string. Used as a content fingerprint so we know
 * when to reuse vs rebuild chunks.
 *
 * Runs server-side (Node Web Crypto API).
 */
export async function sha256Hex(input: string): Promise<string> {
  const data = new TextEncoder().encode(input)
  const buf = await crypto.subtle.digest('SHA-256', data)
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}
