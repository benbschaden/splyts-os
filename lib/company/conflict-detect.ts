import Anthropic from '@anthropic-ai/sdk'
import { DEFAULT_MODEL } from '@/lib/ai/models'
import { buildConflictDetectPrompt, type KnowledgeDoc } from '@/lib/ai/prompts'

export interface DetectedConflict {
  topic: string
  description: string
  excerpt_a: string | null
  excerpt_b: string | null
  file_name_a: string
  file_name_b: string
}

function isValidConflictArray(raw: unknown): raw is DetectedConflict[] {
  if (!Array.isArray(raw)) return false
  return raw.every(
    (item) =>
      typeof item === 'object' &&
      item !== null &&
      typeof (item as Record<string, unknown>).topic === 'string' &&
      typeof (item as Record<string, unknown>).description === 'string',
  )
}

/**
 * Runs a Claude call to detect contradictions between the provided documents.
 * Returns an array of conflicts (may be empty if no contradictions found).
 *
 * ISOLATION: Only called from app/api/company-knowledge/upload/route.ts.
 * Never call from generate, chat, or output-related routes.
 */
export async function detectConflicts(docs: KnowledgeDoc[]): Promise<DetectedConflict[]> {
  if (docs.length < 2) return []

  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    console.error('[conflict-detect] ANTHROPIC_API_KEY not set')
    return []
  }

  const anthropic = new Anthropic({ apiKey, maxRetries: 4 })
  const prompt = buildConflictDetectPrompt(docs)

  let raw: string
  try {
    const message = await anthropic.messages.create({
      model: DEFAULT_MODEL.id,
      max_tokens: 1024,
      messages: [{ role: 'user', content: prompt }],
    })
    const textBlock = message.content.find((b) => b.type === 'text')
    raw = textBlock?.type === 'text' ? textBlock.text.trim() : '[]'
  } catch (err) {
    console.error('[conflict-detect] Claude call failed:', err)
    return []
  }

  let parsed: unknown
  try {
    const cleaned = raw.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '').trim()
    parsed = JSON.parse(cleaned)
  } catch {
    console.error('[conflict-detect] Could not parse Claude response as JSON:', raw)
    return []
  }

  if (!isValidConflictArray(parsed)) {
    console.error('[conflict-detect] Unexpected response shape:', parsed)
    return []
  }

  return parsed.map((c) => ({
    topic: c.topic,
    description: c.description,
    excerpt_a: c.excerpt_a ?? null,
    excerpt_b: c.excerpt_b ?? null,
    file_name_a: c.file_name_a,
    file_name_b: c.file_name_b,
  }))
}
