export type AIProvider = 'anthropic'
// Future: | 'openai' | 'google'

export interface AIModel {
  id: string
  provider: AIProvider
  label: string
  description: string
  default?: boolean
}

export const AI_MODELS: AIModel[] = [
  {
    id: 'claude-opus-4-5',
    provider: 'anthropic',
    label: 'Claude Opus',
    description: 'Most capable — best for polished, high-stakes content',
    default: true,
  },
  {
    id: 'claude-sonnet-4-5',
    provider: 'anthropic',
    label: 'Claude Sonnet',
    description: 'Fast and balanced — great for most content',
  },
  {
    id: 'claude-3-5-haiku-20241022',
    provider: 'anthropic',
    label: 'Claude Haiku',
    description: 'Fastest — ideal for quick drafts and iteration',
  },
]

export const DEFAULT_MODEL = AI_MODELS.find((m) => m.default) ?? AI_MODELS[0]

export function getModelById(id: string): AIModel | undefined {
  return AI_MODELS.find((m) => m.id === id)
}
