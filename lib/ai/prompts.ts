import { BUSINESS_PLAN_SECTIONS, getAiVisibleKeys, type BusinessPlanSections } from '@/lib/company/business-plan-sections'
import type { PersonaRow } from '@/lib/queries/personas'

interface BrandContext {
  company_name: string
  mission: string
  vision: string
  north_star: string
  voice: string
  tone: string
  pillars: string
  target_audience: string
  values: string | null
}

function buildBusinessPlanBlock(sections: BusinessPlanSections): string {
  const visible = getAiVisibleKeys(sections)
  const filled = BUSINESS_PLAN_SECTIONS
    .filter((s) => visible.has(s.key) && (sections[s.key] ?? '').trim())
    .map((s) => `${s.label}: ${sections[s.key].trim()}`)
  return filled.join('\n')
}

function buildPersonasBlock(personas: PersonaRow[]): string {
  const visible = personas.filter((p) => p.include_in_ai)
  if (visible.length === 0) return ''
  return visible.map((p) => {
    const parts: string[] = [`Persona: ${p.name}`]
    if (p.tagline) parts.push(`Summary: ${p.tagline}`)
    const demo: string[] = [p.age_range, p.job_title, p.industry, p.company_size, p.location].filter(Boolean) as string[]
    if (demo.length) parts.push(`Demographics: ${demo.join(', ')}`)
    if (p.goals) parts.push(`Goals: ${p.goals}`)
    if (p.frustrations) parts.push(`Frustrations: ${p.frustrations}`)
    if (p.motivations) parts.push(`Motivations: ${p.motivations}`)
    if (p.behaviors) parts.push(`Behaviours: ${p.behaviors}`)
    if (p.values) parts.push(`Values: ${p.values}`)
    if (p.channels) parts.push(`Channels: ${p.channels}`)
    if (p.buying_triggers) parts.push(`Buying triggers: ${p.buying_triggers}`)
    if (p.objections) parts.push(`Objections: ${p.objections}`)
    if (p.quote) parts.push(`In their words: "${p.quote}"`)
    return parts.join('\n')
  }).join('\n\n')
}

export function buildChatSystemPrompt(params: {
  brand: BrandContext | null
  businessPlanSections: BusinessPlanSections | null
  personas: PersonaRow[]
  includeBrand: boolean
  includeBusinessPlan: boolean
  includePersonas: boolean
}): string {
  const { brand, businessPlanSections, personas, includeBrand, includeBusinessPlan, includePersonas } = params

  const lines: string[] = []

  lines.push('You are a knowledgeable AI assistant for a company operating system.')
  lines.push('You help team members think through problems, plan work, and develop ideas.')
  lines.push('Be direct, specific, and grounded in the company context provided below.')
  lines.push('')

  if (includeBrand && brand) {
    lines.push('[COMPANY CONTEXT]')
    lines.push(`Company: ${brand.company_name}`)
    if (brand.mission) lines.push(`Mission: ${brand.mission}`)
    if (brand.vision) lines.push(`Vision: ${brand.vision}`)
    if (brand.north_star) lines.push(`North Star: ${brand.north_star}`)
    if (brand.voice) lines.push(`Brand voice: ${brand.voice}`)
    if (brand.tone) lines.push(`Brand tone: ${brand.tone}`)
    if (brand.pillars) lines.push(`Pillars: ${brand.pillars}`)
    if (brand.target_audience) lines.push(`Target audience: ${brand.target_audience}`)
    if (brand.values) lines.push(`Values: ${brand.values}`)
    lines.push('')
  }

  if (includeBusinessPlan && businessPlanSections) {
    const planBlock = buildBusinessPlanBlock(businessPlanSections)
    if (planBlock) {
      lines.push('[BUSINESS PLAN]')
      lines.push(planBlock)
      lines.push('')
    }
  }

  if (includePersonas && personas.length > 0) {
    const personasBlock = buildPersonasBlock(personas)
    if (personasBlock) {
      lines.push('[TARGET PERSONAS]')
      lines.push(personasBlock)
      lines.push('')
    }
  }

  lines.push('Use the company context above to give grounded, relevant answers.')
  lines.push('When you do not know something, say so — do not make up company details.')

  return lines.join('\n')
}

export function buildDocumentCapturePrompt(params: {
  conversationText: string
  documentType: string
  brand: BrandContext | null
}): string {
  const { conversationText, documentType, brand } = params

  const lines: string[] = []

  lines.push(`You are drafting a ${documentType} based on the following conversation.`)
  if (brand) {
    lines.push(`The document is for ${brand.company_name}.`)
    lines.push(`Write in the company voice: ${brand.voice || 'clear and professional'}.`)
  }
  lines.push('')
  lines.push('[CONVERSATION]')
  lines.push(conversationText)
  lines.push('')
  lines.push('---')
  lines.push(`Now write a well-structured ${documentType} that captures the key insights, decisions, and next steps from this conversation.`)
  lines.push('Format it clearly with headings and sections where appropriate.')
  lines.push('Output only the document content — no preamble, no explanation.')

  return lines.join('\n')
}
