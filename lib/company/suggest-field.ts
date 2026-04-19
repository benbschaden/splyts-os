import Anthropic from '@anthropic-ai/sdk'
import { DEFAULT_MODEL } from '@/lib/ai/models'
import { buildSuggestFieldPrompt, type KnowledgeDoc } from '@/lib/ai/prompts'

export interface ResolvedConflict {
  topic: string
  trusted_excerpt: string
}

export interface SuggestFieldInput {
  fieldKey: string
  fieldLabel: string
  fieldHint: string
  currentFormValues: Record<string, string>
  knowledgeDocs: KnowledgeDoc[]
  hasActiveConflicts: boolean
  resolvedConflicts: ResolvedConflict[]
}

export interface SuggestFieldResult {
  suggestion: string
  sources: string[]
}

/**
 * Calls Claude to draft a value for a specific company profile field.
 *
 * ISOLATION: Only called from app/api/company/suggest/route.ts.
 * Never called from generate, chat, or output-related routes.
 */
export async function suggestField(input: SuggestFieldInput): Promise<SuggestFieldResult> {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY not configured')

  const anthropic = new Anthropic({ apiKey, maxRetries: 4 })
  const prompt = buildSuggestFieldPrompt(input)

  const message = await anthropic.messages.create({
    model: DEFAULT_MODEL.id,
    max_tokens: 1024,
    messages: [{ role: 'user', content: prompt }],
  })

  const textBlock = message.content.find((b) => b.type === 'text')
  if (!textBlock || textBlock.type !== 'text') {
    throw new Error('No text response from Claude')
  }

  return {
    suggestion: textBlock.text.trim(),
    sources: input.knowledgeDocs.map((d) => d.fileName),
  }
}
