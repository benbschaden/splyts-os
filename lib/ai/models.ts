export type AIProvider = 'anthropic' | 'openai'
export type OpenAIApiType = 'chat' | 'responses'

export interface AIModel {
  id: string
  provider: AIProvider
  label: string
  description: string
  default?: boolean
  openaiApi?: OpenAIApiType
  /**
   * When `false`, callers must not send `temperature` on Anthropic Messages API requests.
   * (e.g. Claude Opus 4.7 does not support temperature.)
   */
  supportsAnthropicTemperature?: boolean
}

export const AI_MODELS: AIModel[] = [
  {
    id: 'claude-opus-4-7',
    provider: 'anthropic',
    label: 'Claude Opus',
    description: 'Most capable — best for polished, high-stakes content',
    default: true,
    supportsAnthropicTemperature: false,
  },
  {
    id: 'claude-opus-4-6',
    provider: 'anthropic',
    label: 'Claude Opus 4.6',
    description: 'Previous Opus — for legacy outputs that pinned 4.6',
  },
  {
    id: 'claude-sonnet-4-5',
    provider: 'anthropic',
    label: 'Claude Sonnet',
    description: 'Fast and balanced — great for most content',
  },
  {
    id: 'claude-haiku-4-5-20251001',
    provider: 'anthropic',
    label: 'Claude Haiku',
    description: 'Fastest — ideal for quick drafts and iteration',
  },
  {
    id: 'gpt-4o',
    provider: 'openai',
    openaiApi: 'chat',
    label: 'GPT-4o',
    description: 'OpenAI flagship — powerful and fast',
  },
  {
    id: 'gpt-4o-mini',
    provider: 'openai',
    openaiApi: 'chat',
    label: 'GPT-4o mini',
    description: 'OpenAI lightweight — quick iteration',
  },
  {
    id: 'gpt-5.4',
    provider: 'openai',
    openaiApi: 'responses',
    label: 'GPT-5.4',
    description: 'OpenAI newest — most powerful reasoning and generation',
  },
  {
    id: 'gpt-5.4-mini',
    provider: 'openai',
    openaiApi: 'responses',
    label: 'GPT-5.4 mini',
    description: 'OpenAI newest lightweight — fast and highly capable',
  },
]

export const DEFAULT_MODEL = AI_MODELS.find((m) => m.default) ?? AI_MODELS[0]

export function getModelById(id: string): AIModel | undefined {
  return AI_MODELS.find((m) => m.id === id)
}
