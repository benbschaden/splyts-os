import Anthropic from '@anthropic-ai/sdk'
import OpenAI from 'openai'
import type { AIModel } from '@/lib/ai/models'

/**
 * Runs a multi-turn chat for the meeting Discuss feature (server-only).
 */
export async function runMeetingChatCompletion(params: {
  model: AIModel
  systemPrompt: string
  messages: Array<{ role: 'user' | 'assistant'; content: string }>
}): Promise<string> {
  const { model, systemPrompt, messages } = params

  if (model.provider === 'anthropic') {
    const apiKey = process.env.ANTHROPIC_API_KEY
    if (!apiKey) throw new Error('Anthropic is not configured')
    const anthropic = new Anthropic({ apiKey, maxRetries: 4 })
    const anthropicMessages: Anthropic.MessageParam[] = messages.map((m) => ({
      role: m.role,
      content: m.content,
    }))
    const response = await anthropic.messages.create({
      model: model.id,
      max_tokens: 8000,
      system: systemPrompt,
      messages: anthropicMessages,
    })
    const textBlock = response.content.find((b) => b.type === 'text')
    return textBlock?.type === 'text' ? textBlock.text.trim() : ''
  }

  if (model.provider === 'openai') {
    const apiKey = process.env.OPENAI_API_KEY
    if (!apiKey) throw new Error('OpenAI is not configured')
    const openai = new OpenAI({ apiKey })
    const mapped = messages.map((m) => ({
      role: m.role as 'user' | 'assistant',
      content: m.content,
    }))
    if (model.openaiApi === 'responses') {
      const response = await openai.responses.create({
        model: model.id,
        instructions: systemPrompt,
        input: mapped,
      })
      return response.output_text?.trim() ?? ''
    }
    const response = await openai.chat.completions.create({
      model: model.id,
      max_tokens: 8000,
      messages: [{ role: 'system', content: systemPrompt }, ...mapped],
    })
    return response.choices[0]?.message?.content?.trim() ?? ''
  }

  throw new Error(`Provider "${model.provider}" is not supported`)
}
