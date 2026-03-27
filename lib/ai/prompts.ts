import { BUSINESS_PLAN_SECTIONS, getAiVisibleKeys, type BusinessPlanSections } from '@/lib/company/business-plan-sections'
import type { PersonaRow } from '@/lib/queries/personas'

export type { BusinessPlanSections }

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

export type GenerationAuthor =
  | { type: 'company' }
  | {
      type: 'named'
      name: string
      role: string | null
      voice: string | null
      tone: string | null
      writing_style: string | null
      personal_pillars: string | null
      platform_notes: string | null
    }

export function buildGenerationSystemPrompt(params: {
  brand: BrandContext
  businessPlanSections: BusinessPlanSections | null
  personas: PersonaRow[]
  contentTypeName: string
  basePrompt: string
  customRules: string
  author: GenerationAuthor
}): string {
  const { brand, businessPlanSections, personas, contentTypeName, basePrompt, customRules, author } = params

  const lines: string[] = []

  lines.push(`You are a professional content creation assistant for ${brand.company_name}.`)
  lines.push(`Your job is to help create high-quality ${contentTypeName} content through a structured, collaborative process.`)
  lines.push('')
  lines.push('[PROCESS — follow this exactly]')
  lines.push('Step 1 — When the user sends their first message describing what they want:')
  lines.push('- Read their description carefully and extract every detail they have already provided')
  lines.push('- Only ask about information that is genuinely missing and that you cannot reasonably infer')
  lines.push('- Do NOT ask about anything the user already told you')
  lines.push('- Do NOT state assumptions about things they clearly specified')
  lines.push('- If you do need to ask, list only those specific missing questions — keep it short')
  lines.push('- If you have everything you need, skip questions entirely and go straight to the draft')
  lines.push('')
  lines.push('Step 2 — Producing a draft:')
  lines.push('- When you have enough information, produce a complete, ready-to-publish draft')
  lines.push('- Begin your draft message with the line "Here\'s your draft:" on its own line')
  lines.push('- Output the full content — not a summary, outline, or placeholder')
  lines.push('')
  lines.push('Step 3 — Refinement:')
  lines.push('- Accept feedback and revise')
  lines.push('- Each revised version begins with "Here\'s your updated draft:" on its own line')
  lines.push('- Always output the complete revised draft, not just the changed parts')
  lines.push('- Continue until the user confirms they are happy')
  lines.push('')
  lines.push('[FORMATTING]')
  lines.push('Write in plain text only. No markdown. No headings (no ###). No bold (**text**). No bullet points with asterisks.')
  lines.push('Use plain paragraph breaks to separate sections. The draft itself should be formatted naturally for its content type.')
  lines.push('')
  lines.push('[BRAND CONTEXT]')
  lines.push(`Company: ${brand.company_name}`)
  lines.push(`Mission: ${brand.mission}`)
  lines.push(`Vision: ${brand.vision}`)
  lines.push(`North Star: ${brand.north_star}`)
  lines.push(`Brand voice: ${brand.voice}`)
  lines.push(`Brand tone: ${brand.tone}`)
  lines.push(`Pillars: ${brand.pillars}`)
  lines.push(`Target audience: ${brand.target_audience}`)
  if (brand.values) lines.push(`Values: ${brand.values}`)

  if (businessPlanSections) {
    const planBlock = buildBusinessPlanBlock(businessPlanSections)
    if (planBlock) {
      lines.push('')
      lines.push('[BUSINESS CONTEXT]')
      lines.push('Use this as background to ensure content is strategically aligned.')
      lines.push(planBlock)
    }
  }

  if (personas.length > 0) {
    const personasBlock = buildPersonasBlock(personas)
    if (personasBlock) {
      lines.push('')
      lines.push('[TARGET PERSONAS]')
      lines.push('Write content that speaks to their goals, frustrations, and language.')
      lines.push(personasBlock)
    }
  }

  if (basePrompt) {
    lines.push('')
    lines.push('[CONTENT TYPE STRUCTURE]')
    lines.push(basePrompt)
  }

  if (customRules) {
    lines.push('')
    lines.push('[CONTENT RULES]')
    lines.push(customRules)
  }

  lines.push('')
  if (author.type === 'company') {
    lines.push('[AUTHOR]')
    lines.push('Write in the brand voice and tone defined above. This is a company post — do not use personal first-person.')
  } else {
    lines.push('[AUTHOR]')
    lines.push("Write in this specific author's voice, not the generic brand voice.")
    lines.push(`Name: ${author.name}`)
    if (author.role) lines.push(`Role: ${author.role}`)
    if (author.voice) lines.push(`Voice: ${author.voice}`)
    if (author.tone) lines.push(`Tone: ${author.tone}`)
    if (author.writing_style) lines.push(`Writing style: ${author.writing_style}`)
    if (author.personal_pillars) lines.push(`Personal pillars: ${author.personal_pillars}`)
    if (author.platform_notes) lines.push(`Platform notes: ${author.platform_notes}`)
    lines.push('The brand context (mission, vision, north star, pillars, audience) still applies — but voice, tone, and style must match this author.')
  }

  lines.push('')
  lines.push('---')
  lines.push('Wait for the user to describe what they want to create. Then respond following the process above.')

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
