import { BUSINESS_PLAN_SECTIONS, getAiVisibleKeys, type BusinessPlanSections } from '@/lib/company/business-plan-sections'
import { PRODUCT_SECTIONS, type ProductSections } from '@/lib/company/product-sections'
import type { PersonaRow } from '@/lib/queries/personas'
import type { ProductFeatureRow } from '@/lib/queries/product-features'
import type { GoalPeriodWithGoals } from '@/lib/queries/goal-periods'
import type { CompetitorRow } from '@/lib/queries/competitors'
import type { SocialProofRow } from '@/lib/queries/social-proof'
import type { BrandNarrativeRow } from '@/lib/queries/brand-narratives'
import type { TerminologyRow } from '@/lib/queries/terminology'
import type { KpiDefinitionRow } from '@/lib/queries/kpi-definitions'
import type { KpiSnapshotRow } from '@/lib/queries/kpi-snapshots'
import type { RetrievedContext } from '@/lib/retrieval/search'

export type { BusinessPlanSections }

// Approximate token count (4 chars ≈ 1 token)
function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4)
}

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
  guardrails?: string | null
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

function buildProductContextBlock(sections: ProductSections, compact = false): string {
  const filled = PRODUCT_SECTIONS
    .filter((s) => (s.aiVisibleByDefault || !compact) && (sections[s.key] ?? '').trim())
    .map((s) => `${s.label}: ${sections[s.key].trim()}`)
  return filled.join('\n')
}

function buildProductFeaturesBlock(features: ProductFeatureRow[], nameOnly = false): string {
  const visible = features.filter((f) => f.include_in_ai)
  if (visible.length === 0) return ''
  return visible.map((f) => {
    if (nameOnly) return `- ${f.name}`
    const parts = [`- ${f.name}`]
    if (f.tagline) parts[0] += `: ${f.tagline}`
    if (f.status !== 'live') parts[0] += ` (${f.status})`
    return parts[0]
  }).join('\n')
}

function buildCurrentGoalsBlock(period: GoalPeriodWithGoals): string {
  const parts: string[] = []
  parts.push(`Period: ${period.period_label}`)
  if (period.focus_areas?.trim()) parts.push(`Focus areas: ${period.focus_areas.trim()}`)
  if (period.goals.length > 0) {
    parts.push(`Goals:\n${period.goals.map((g) => `  - ${g.title}${g.description ? `: ${g.description}` : ''}`).join('\n')}`)
  }
  if (period.what_to_push?.trim()) parts.push(`What to push: ${period.what_to_push.trim()}`)
  if (period.what_to_defer?.trim()) parts.push(`What to defer: ${period.what_to_defer.trim()}`)
  return parts.join('\n')
}

function buildTopPerformersBlock(
  outputs: {
    brief: string
    content: string
    reach: number | null
    reach_metric: string | null
    views_30d?: number | null
    website_visits?: number | null
    email_signups?: number | null
  }[],
): string {
  if (outputs.length === 0) return ''
  return outputs
    .map((o, i) => {
      const stats: string[] = []
      if (o.views_30d != null) stats.push(`${o.views_30d.toLocaleString()} views (30d)`)
      else if (o.reach != null) stats.push(`${o.reach.toLocaleString()} ${o.reach_metric ?? 'reach'}`)
      if (o.website_visits != null) stats.push(`${o.website_visits.toLocaleString()} site visits`)
      if (o.email_signups != null) stats.push(`${o.email_signups.toLocaleString()} email signups`)
      const statsStr = stats.length > 0 ? ` (${stats.join(', ')})` : ''
      return `Example ${i + 1}${statsStr}:\nBrief: ${o.brief.slice(0, 120)}\nContent: ${o.content.slice(0, 300)}${o.content.length > 300 ? '…' : ''}`
    })
    .join('\n\n')
}

function buildCompetitorsBlock(competitors: CompetitorRow[]): string {
  const visible = competitors.filter((c) => c.include_in_ai)
  if (visible.length === 0) return ''
  return visible.map((c) => {
    const parts: string[] = [`Competitor: ${c.name}`]
    if (c.positioning) parts.push(`Positioning: ${c.positioning}`)
    if (c.strengths) parts.push(`Strengths: ${c.strengths}`)
    if (c.weaknesses) parts.push(`Weaknesses: ${c.weaknesses}`)
    if (c.pricing_notes) parts.push(`Pricing: ${c.pricing_notes}`)
    if (c.battle_card) parts.push(`Battle card: ${c.battle_card}`)
    return parts.join('\n')
  }).join('\n\n')
}

function buildSocialProofBlock(proof: SocialProofRow[]): string {
  const approved = proof.filter((p) => p.approved && p.include_in_ai)
  if (approved.length === 0) return ''
  return approved.map((p) => {
    if (p.proof_type === 'metric') {
      return `Metric: ${p.metric_value ?? ''} ${p.metric_label ?? ''}${p.attribution ? ` — ${p.attribution}` : ''}`.trim()
    }
    const parts: string[] = []
    if (p.quote) parts.push(`"${p.quote}"`)
    if (p.attribution && p.company) parts.push(`— ${p.attribution}, ${p.company}`)
    else if (p.attribution) parts.push(`— ${p.attribution}`)
    return parts.join(' ')
  }).join('\n')
}

function buildNarrativesBlock(narratives: BrandNarrativeRow[]): string {
  const visible = narratives.filter((n) => n.include_in_ai)
  if (visible.length === 0) return ''
  return visible.map((n) => {
    const parts = [`${n.title}: ${n.narrative}`]
    if (n.usage_context) parts.push(`Use when: ${n.usage_context}`)
    return parts.join('\n')
  }).join('\n\n')
}

function buildTerminologyBlock(terms: TerminologyRow[]): string {
  if (terms.length === 0) return ''
  return terms.map((t) => {
    const line = `Always say "${t.preferred}"` + (t.avoid ? `, never say "${t.avoid}"` : '')
    return t.context ? `${line} (${t.context})` : line
  }).join('\n')
}

export type ProjectMaterialForPrompt = {
  material_type: string
  title: string | null
  content: string | null
  file_name: string | null
  link_url: string | null
}

function buildProjectMaterialsBlock(materials: ProjectMaterialForPrompt[]): string {
  const grouped: Record<string, ProjectMaterialForPrompt[]> = {}
  for (const m of materials) {
    const key = m.material_type
    if (!grouped[key]) grouped[key] = []
    grouped[key].push(m)
  }

  const lines: string[] = []

  if (grouped['note']) {
    lines.push('Notes:')
    for (const m of grouped['note']) {
      const title = m.title ? m.title.slice(0, 200) : 'Untitled note'
      lines.push(`- ${title}`)
      if (m.content) lines.push(`  ${m.content.slice(0, 500)}`)
    }
  }

  if (grouped['file']) {
    lines.push('Files:')
    for (const m of grouped['file']) {
      lines.push(`- ${m.file_name ?? 'Unnamed file'}`)
    }
  }

  if (grouped['link']) {
    lines.push('Links:')
    for (const m of grouped['link']) {
      const label = m.title ? `${m.title}: ${m.link_url ?? ''}` : (m.link_url ?? 'Unknown link')
      lines.push(`- ${label}`)
    }
  }

  return lines.join('\n')
}

function buildRetrievedContextBlock(items: RetrievedContext[]): string {
  if (items.length === 0) return ''
  return items.map((item) => {
    const typeLabel = item.visibility === 'filed'
      ? 'Filed document (canonical)'
      : item.type === 'material'
        ? 'Project material'
        : 'Shared document'
    const title = item.title ? item.title : 'Untitled'
    return `[${typeLabel}] ${title}\n${item.summary}`
  }).join('\n\n')
}

function buildKpiSnapshotBlock(
  definitions: KpiDefinitionRow[],
  snapshot: KpiSnapshotRow | null,
): string {
  if (!snapshot || definitions.length === 0) return ''
  const defMap = new Map(definitions.map((d) => [d.id, d]))
  const lines: string[] = [`Week of ${snapshot.snapshot_date}:`]
  for (const [kpiId, value] of Object.entries(snapshot.values)) {
    const def = defMap.get(kpiId)
    if (!def) continue
    const prefix = def.unit === 'currency' ? '$' : ''
    const suffix = def.unit === 'percent' ? '%' : def.unit === 'ratio' ? 'x' : ''
    lines.push(`- ${def.name}: ${prefix}${value.toLocaleString()}${suffix}`)
  }
  return lines.join('\n')
}

export function buildChatSystemPrompt(params: {
  brand: BrandContext | null
  businessPlanSections: BusinessPlanSections | null
  personas: PersonaRow[]
  productSections: ProductSections | null
  productFeatures: ProductFeatureRow[]
  currentGoals: GoalPeriodWithGoals | null
  filedDocs: { title: string; body: string }[]
  competitors: CompetitorRow[]
  socialProof: SocialProofRow[]
  narratives: BrandNarrativeRow[]
  terminology: TerminologyRow[]
  kpiDefinitions: KpiDefinitionRow[]
  kpiSnapshot: KpiSnapshotRow | null
  includeBrand: boolean
  includeBusinessPlan: boolean
  includePersonas: boolean
  includeProduct: boolean
  includeCurrentGoals: boolean
  includeFiledDocs: boolean
  includeCompetitors: boolean
  includeSocialProof: boolean
  includeKpis: boolean
  projectMaterials?: ProjectMaterialForPrompt[]
  includeProjectMaterials?: boolean
  retrievedContext?: RetrievedContext[]
}): string {
  const {
    brand, businessPlanSections, personas, productSections, productFeatures,
    currentGoals, filedDocs, competitors, socialProof, narratives, terminology,
    kpiDefinitions, kpiSnapshot,
    includeBrand, includeBusinessPlan, includePersonas, includeProduct,
    includeCurrentGoals, includeFiledDocs, includeCompetitors, includeSocialProof,
    includeKpis, projectMaterials, includeProjectMaterials, retrievedContext,
  } = params

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
    if (brand.guardrails) {
      lines.push('')
      lines.push('[GUARDRAILS — never violate these]')
      lines.push(brand.guardrails)
    }

    // Narratives and terminology auto-included when brand is on
    if (narratives.length > 0) {
      const narrativesBlock = buildNarrativesBlock(narratives)
      if (narrativesBlock) {
        lines.push('')
        lines.push('[CORE NARRATIVES]')
        lines.push(narrativesBlock)
      }
    }

    if (terminology.length > 0) {
      const terminologyBlock = buildTerminologyBlock(terminology)
      if (terminologyBlock) {
        lines.push('')
        lines.push('[TERMINOLOGY RULES]')
        lines.push(terminologyBlock)
      }
    }

    lines.push('')
  }

  if (includeCompetitors && competitors.length > 0) {
    const competitorsBlock = buildCompetitorsBlock(competitors)
    if (competitorsBlock) {
      lines.push('[COMPETITIVE LANDSCAPE]')
      lines.push(competitorsBlock)
      lines.push('')
    }
  }

  if (includeSocialProof && socialProof.length > 0) {
    const proofBlock = buildSocialProofBlock(socialProof)
    if (proofBlock) {
      lines.push('[SOCIAL PROOF — use to strengthen claims]')
      lines.push(proofBlock)
      lines.push('')
    }
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

  if (includeProduct && productSections) {
    const productBlock = buildProductContextBlock(productSections)
    if (productBlock) {
      lines.push('[PRODUCT CONTEXT]')
      lines.push(productBlock)
      lines.push('')
    }
    if (productFeatures.length > 0) {
      const featuresBlock = buildProductFeaturesBlock(productFeatures)
      if (featuresBlock) {
        lines.push('[PRODUCT FEATURES]')
        lines.push(featuresBlock)
        lines.push('')
      }
    }
  }

  if (includeCurrentGoals && currentGoals) {
    const goalsBlock = buildCurrentGoalsBlock(currentGoals)
    if (goalsBlock) {
      lines.push('[CURRENT GOALS]')
      lines.push(goalsBlock)
      lines.push('')
    }
  }

  if (retrievedContext && retrievedContext.length > 0) {
    const contextBlock = buildRetrievedContextBlock(retrievedContext)
    if (contextBlock) {
      lines.push('[RELEVANT KNOWLEDGE — retrieved based on this conversation]')
      lines.push('Filed documents are canonical company truth. Use them with high confidence.')
      lines.push(contextBlock)
      lines.push('')
    }
  } else if (includeFiledDocs && filedDocs.length > 0) {
    lines.push('[FILED DOCUMENTS]')
    filedDocs.slice(0, 3).forEach((doc) => {
      lines.push(`Document: ${doc.title}`)
      lines.push(doc.body.slice(0, 500))
    })
    lines.push('')
  }

  if (includeProjectMaterials && projectMaterials && projectMaterials.length > 0) {
    const materialsBlock = buildProjectMaterialsBlock(projectMaterials)
    if (materialsBlock) {
      lines.push('[PROJECT MATERIALS — research, notes, and references for this project]')
      lines.push(materialsBlock)
      lines.push('')
    }
  }

  if (includeKpis && kpiDefinitions.length > 0) {
    const kpiBlock = buildKpiSnapshotBlock(kpiDefinitions, kpiSnapshot)
    if (kpiBlock) {
      lines.push('[KEY METRICS — latest snapshot]')
      lines.push(kpiBlock)
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
  productSections: ProductSections | null
  productFeatures: ProductFeatureRow[]
  currentGoals: GoalPeriodWithGoals | null
  competitors: CompetitorRow[]
  socialProof: SocialProofRow[]
  narratives: BrandNarrativeRow[]
  terminology: TerminologyRow[]
  kpiDefinitions: KpiDefinitionRow[]
  kpiSnapshot: KpiSnapshotRow | null
  topPerformers: {
    brief: string
    content: string
    reach: number | null
    reach_metric: string | null
    views_30d?: number | null
    website_visits?: number | null
    email_signups?: number | null
  }[]
  contentTypeName: string
  basePrompt: string
  customRules: string
  cadence: string | null
  author: GenerationAuthor
  projectMaterials?: ProjectMaterialForPrompt[]
  retrievedContext?: RetrievedContext[]
}): string {
  const {
    brand, businessPlanSections, personas, productSections, productFeatures,
    currentGoals, competitors, socialProof, narratives, terminology,
    kpiDefinitions, kpiSnapshot, topPerformers,
    contentTypeName, basePrompt, customRules, cadence, author,
    projectMaterials, retrievedContext,
  } = params

  const lines: string[] = []
  let tokenCount = 0
  const TOKEN_BUDGET = 6000

  function addSection(header: string, content: string) {
    const block = `[${header}]\n${content}\n`
    const tokens = estimateTokens(block)
    if (tokenCount + tokens < TOKEN_BUDGET) {
      lines.push(`[${header}]`)
      lines.push(content)
      lines.push('')
      tokenCount += tokens
    }
  }

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

  tokenCount = estimateTokens(lines.join('\n'))

  // Brand context — always included, highest priority
  const brandLines = [
    `Company: ${brand.company_name}`,
    `Mission: ${brand.mission}`,
    `Vision: ${brand.vision}`,
    `North Star: ${brand.north_star}`,
    `Brand voice: ${brand.voice}`,
    `Brand tone: ${brand.tone}`,
    `Pillars: ${brand.pillars}`,
    `Target audience: ${brand.target_audience}`,
    brand.values ? `Values: ${brand.values}` : null,
  ].filter(Boolean).join('\n')
  addSection('BRAND CONTEXT', brandLines)

  if (brand.guardrails) {
    addSection('GUARDRAILS — never violate these', brand.guardrails)
  }

  // Narratives — high priority, core messaging
  if (narratives.length > 0) {
    const narrativesBlock = buildNarrativesBlock(narratives)
    if (narrativesBlock) addSection('CORE NARRATIVES', `These are the recurring stories to anchor content in.\n${narrativesBlock}`)
  }

  // Terminology — high priority, consistency rules
  if (terminology.length > 0) {
    const terminologyBlock = buildTerminologyBlock(terminology)
    if (terminologyBlock) addSection('TERMINOLOGY RULES', terminologyBlock)
  }

  // Competitors — medium priority
  if (competitors.length > 0) {
    const competitorsBlock = buildCompetitorsBlock(competitors)
    if (competitorsBlock) addSection('COMPETITIVE LANDSCAPE', `Use for differentiation, never disparage competitors directly.\n${competitorsBlock}`)
  }

  // Social proof — medium priority
  if (socialProof.length > 0) {
    const proofBlock = buildSocialProofBlock(socialProof)
    if (proofBlock) addSection('SOCIAL PROOF — use to strengthen claims', proofBlock)
  }

  // Business plan — high priority
  if (businessPlanSections) {
    const planBlock = buildBusinessPlanBlock(businessPlanSections)
    if (planBlock) addSection('BUSINESS CONTEXT', `Use this as background to ensure content is strategically aligned.\n${planBlock}`)
  }

  // Personas — high priority
  if (personas.length > 0) {
    const personasBlock = buildPersonasBlock(personas)
    if (personasBlock) addSection('TARGET PERSONAS', `Write content that speaks to their goals, frustrations, and language.\n${personasBlock}`)
  }

  // Current goals — high priority for generation
  if (currentGoals) {
    const goalsBlock = buildCurrentGoalsBlock(currentGoals)
    if (goalsBlock) addSection('CURRENT GOALS', `Use these to ensure content is strategically timed and on-message.\n${goalsBlock}`)
  }

  // Product context — medium priority
  if (productSections) {
    const productBlock = buildProductContextBlock(productSections)
    if (productBlock) addSection('PRODUCT CONTEXT', productBlock)
  }

  // Product features — medium priority, name:tagline format
  if (productFeatures.length > 0) {
    const featuresBlock = buildProductFeaturesBlock(productFeatures)
    if (featuresBlock) {
      addSection('PRODUCT FEATURES', featuresBlock)
    } else {
      // If over budget, try name-only compact format
      const compactFeatures = buildProductFeaturesBlock(productFeatures, true)
      if (compactFeatures) addSection('PRODUCT FEATURES', compactFeatures)
    }
  }

  if (projectMaterials && projectMaterials.length > 0) {
    const materialsBlock = buildProjectMaterialsBlock(projectMaterials)
    if (materialsBlock) addSection('RESEARCH MATERIALS', 'Use these as source material and evidence for the content.\n' + materialsBlock)
  }

  if (retrievedContext && retrievedContext.length > 0) {
    const contextBlock = buildRetrievedContextBlock(retrievedContext)
    if (contextBlock) addSection('RELEVANT COMPANY KNOWLEDGE', 'Retrieved from company documents. Filed documents are canonical — use with highest confidence.\n' + contextBlock)
  }

  if (basePrompt) {
    addSection('CONTENT TYPE STRUCTURE', basePrompt)
  }

  const rulesLines: string[] = []
  if (customRules) rulesLines.push(customRules)
  if (cadence) rulesLines.push(`Posting cadence: ${cadence}`)
  if (rulesLines.length > 0) {
    addSection('CONTENT RULES', rulesLines.join('\n'))
  }

  // Author
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

  // KPI snapshot — medium priority
  if (kpiDefinitions.length > 0) {
    const kpiBlock = buildKpiSnapshotBlock(kpiDefinitions, kpiSnapshot)
    if (kpiBlock) addSection('KEY METRICS — latest snapshot', kpiBlock)
  }

  // Top performers — lowest priority, drop if over budget
  if (topPerformers.length > 0) {
    const performersBlock = buildTopPerformersBlock(topPerformers)
    const tokens = estimateTokens(performersBlock)
    if (tokenCount + tokens < TOKEN_BUDGET) {
      lines.push('[TOP PERFORMING CONTENT — use as style reference]')
      lines.push(performersBlock)
      lines.push('')
      tokenCount += tokens
    }
  }

  lines.push('---')
  lines.push('Wait for the user to describe what they want to create. Then respond following the process above.')

  console.log(`[prompts] Generation system prompt ~${estimateTokens(lines.join('\n'))} tokens`)

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

export function buildExtractPrompt(params: {
  conversationText: string
  projectName: string
  brand: BrandContext | null
}): string {
  const { conversationText, projectName, brand } = params

  const lines: string[] = []

  lines.push(`You are reviewing a conversation from the project "${projectName}".`)
  if (brand) {
    lines.push(`This project belongs to ${brand.company_name}.`)
  }
  lines.push('')
  lines.push('[CONVERSATION]')
  lines.push(conversationText)
  lines.push('')
  lines.push('---')
  lines.push('Extract the key information from this conversation into a concise reference note.')
  lines.push('Include the following sections where applicable:')
  lines.push('Key Findings: important facts, data points, or insights discovered')
  lines.push('Decisions: any decisions made or direction chosen')
  lines.push('Data Insights: specific numbers, metrics, or data-driven observations')
  lines.push('Action Items: concrete next steps or tasks identified')
  lines.push('')
  lines.push('Format as plain text with labeled sections (e.g. "Key Findings:" on its own line).')
  lines.push('Be concise — this is a reference note, not a full document.')
  lines.push('Omit any section that has no relevant content.')
  lines.push('Output only the note content — no preamble, no explanation.')

  return lines.join('\n')
}

export function buildProjectArchivePrompt(params: {
  projectName: string
  materials: ProjectMaterialForPrompt[]
  outputSummaries: { brief: string; content: string }[]
  brand: BrandContext | null
}): string {
  const { projectName, materials, outputSummaries, brand } = params

  const lines: string[] = []

  lines.push(`You are producing a comprehensive knowledge document for the project "${projectName}".`)
  if (brand) {
    lines.push(`This project belongs to ${brand.company_name}.`)
    lines.push(`Write in the company voice: ${brand.voice || 'clear and professional'}.`)
  }
  lines.push('')

  if (materials.length > 0) {
    const materialsBlock = buildProjectMaterialsBlock(materials)
    if (materialsBlock) {
      lines.push('[PROJECT MATERIALS]')
      lines.push(materialsBlock)
      lines.push('')
    }
  }

  if (outputSummaries.length > 0) {
    lines.push('[OUTPUTS PRODUCED]')
    for (const o of outputSummaries) {
      lines.push(`Brief: ${o.brief.slice(0, 200)}`)
      lines.push(`Content: ${o.content.slice(0, 400)}${o.content.length > 400 ? '…' : ''}`)
      lines.push('')
    }
  }

  lines.push('---')
  lines.push('Produce a comprehensive knowledge document that covers:')
  lines.push('Key Findings: the most important discoveries and insights from this project')
  lines.push('Decisions: choices made and reasoning behind them')
  lines.push('Methodology: how work was approached and what processes were used')
  lines.push('Data Summaries: key numbers, metrics, and data-driven observations')
  lines.push('Outputs Produced: a summary of what was created')
  lines.push('Lessons Learned: what worked well, what could improve')
  lines.push('')
  lines.push('Format as plain text with clearly labeled sections.')
  lines.push('This document will be filed as a permanent company record.')
  lines.push('Output only the document content — no preamble, no explanation.')

  return lines.join('\n')
}

// ─── Company Knowledge: Conflict Detection ────────────────────────────────────

export interface KnowledgeDoc {
  fileName: string
  text: string
}

/**
 * Prompt asking Claude to identify contradictions between a set of uploaded documents.
 * Returns a JSON array of conflict objects.
 * ISOLATION: Only called from lib/company/conflict-detect.ts
 */
export function buildConflictDetectPrompt(docs: KnowledgeDoc[]): string {
  const docBlocks = docs
    .map((d, i) => `DOCUMENT ${i + 1} — ${d.fileName}:\n${d.text.slice(0, 10000)}`)
    .join('\n\n---\n\n')

  const firstName = docs[0]?.fileName ?? 'Document 1'

  return `You are reviewing a set of company documents to identify contradictions.

${docBlocks}

---

Identify any direct contradictions between these documents on topics such as:
- Company vision or long-term direction
- Strategic roadmap or priorities
- Target audience or market positioning
- Mission or company purpose
- Product capabilities or features
- Goals or success metrics

For each contradiction found, return a JSON object. If no contradictions are found, return an empty array.

Respond ONLY with a valid JSON array — no explanation, no markdown, no code fences:

[
  {
    "topic": "short topic name (e.g. 'roadmap', 'target audience')",
    "description": "One or two sentences explaining the contradiction clearly",
    "excerpt_a": "Relevant quote from ${firstName} (max 300 chars)",
    "excerpt_b": "Relevant quote from the other document (max 300 chars)",
    "file_name_a": "${firstName}",
    "file_name_b": "name of the other document"
  }
]`
}

// ─── Company Knowledge: Per-Field Suggestion ──────────────────────────────────

export interface ResolvedConflictContext {
  topic: string
  trusted_excerpt: string
}

export interface FieldSuggestContext {
  fieldKey: string
  fieldLabel: string
  fieldHint: string
  currentFormValues: Record<string, string>
  knowledgeDocs: KnowledgeDoc[]
  hasActiveConflicts: boolean
  resolvedConflicts: ResolvedConflictContext[]
}

/**
 * Prompt asking Claude to draft a value for a specific company profile field.
 * ISOLATION: Only called from lib/company/suggest-field.ts
 */
export function buildSuggestFieldPrompt(ctx: FieldSuggestContext): string {
  const otherFields = Object.entries(ctx.currentFormValues)
    .filter(([k, v]) => k !== ctx.fieldKey && v?.trim())
    .map(([k, v]) => `${k}: ${v.trim()}`)
    .join('\n')

  const docsBlock =
    ctx.knowledgeDocs.length > 0
      ? ctx.knowledgeDocs
          .map((d) => `--- ${d.fileName} ---\n${d.text.slice(0, 8000)}`)
          .join('\n\n')
      : null

  const resolvedBlock =
    ctx.resolvedConflicts.length > 0
      ? ctx.resolvedConflicts
          .map((r) => `Topic: ${r.topic}\nAuthoritative version: ${r.trusted_excerpt}`)
          .join('\n\n')
      : null

  const conflictNote =
    ctx.hasActiveConflicts && !resolvedBlock
      ? '\nIMPORTANT: Conflicting information has been detected in the uploaded documents. ' +
        'If this topic is affected by a conflict, start your response with: ' +
        '[Conflict detected — verify with your team before accepting]\n'
      : ''

  return `You are helping a company fill in their company profile.

FIELD TO DRAFT: ${ctx.fieldLabel}
PURPOSE: ${ctx.fieldHint}
${conflictNote}
${resolvedBlock ? `CONFLICT RESOLUTIONS — treat these as authoritative for their topics, overriding any contradictory text in the documents below:\n${resolvedBlock}\n` : ''}
${otherFields ? `EXISTING COMPANY CONTEXT:\n${otherFields}\n` : ''}
${docsBlock ? `UPLOADED COMPANY DOCUMENTS:\n${docsBlock}\n` : ''}
---

Write a concise, specific value for the "${ctx.fieldLabel}" field. Requirements:
- Be specific to this company, not generic
- Match the expected format (a few sentences for narrative fields, comma-separated for lists)
- Reflect what you learned from the documents and context above
- Do NOT include any preamble, explanation, or label — only the field value itself

Respond with ONLY the field value.`
}

export function buildDiscussionResolutionPrompt(params: {
  title: string
  messageStream: string
}): string {
  return `You are analysing a team discussion to extract structured knowledge from it.

Discussion title: "${params.title}"

Messages:
${params.messageStream}

Extract the following from this discussion and respond with ONLY valid JSON — no markdown, no explanation, just the JSON object:

{
  "summary": "A concise 2-4 sentence summary of what was discussed and concluded.",
  "decisions": ["Decision 1", "Decision 2"],
  "learnings": ["Learning 1", "Learning 2"],
  "nextSteps": ["Action item 1", "Action item 2"]
}

Rules:
- summary: always present, 2-4 sentences
- decisions: concrete choices that were made; empty array [] if none
- learnings: insights, realisations, or knowledge gained; empty array [] if none
- nextSteps: specific action items mentioned or implied; empty array [] if none
- Keep each item concise (one sentence)
- Do not fabricate items not present in the discussion`
}

export function buildDiscussionDocumentPrompt(params: {
  discussionTitle: string
  documentType: string
  messageStream: string
  orgName: string
}): string {
  return `You are drafting a ${params.documentType} document from a team discussion.

Organisation: ${params.orgName}
Discussion title: "${params.discussionTitle}"
Document type: ${params.documentType}

Discussion messages:
${params.messageStream}

Write a well-structured ${params.documentType} document that captures the key content, decisions, and insights from this discussion. The document should:
- Have a clear, informative title on the first line (as a # heading)
- Be structured with ## headings for major sections
- Include a brief summary or executive summary section
- Capture all key points, decisions, and recommendations discussed
- Be written in professional prose, not as a transcript
- Omit conversational filler, keep only the substance

Write the document now:`
}
