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
import type { DiscoveryEntryRow } from '@/lib/queries/discovery-entries'
import type { CustomerInsightRow } from '@/lib/queries/customer-insights'
import type { ContactCommunicationRow } from '@/lib/queries/contact-communications'

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
    lines.push('Files (full content searchable via retrieval — relevant passages will appear below):')
    for (const m of grouped['file']) {
      const label = m.title ?? m.file_name ?? 'Unnamed file'
      lines.push(`- ${label}`)
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
    if (item.type === 'project_material_chunk') {
      const meta = item.metadata as {
        chunk_index?: number
        total_chunks?: number
        material_title?: string
      }
      const chunkLabel =
        meta.chunk_index != null && meta.total_chunks != null
          ? `, chunk ${meta.chunk_index + 1}/${meta.total_chunks}`
          : ''
      const title = meta.material_title ?? item.title ?? 'Untitled'
      return `[file: ${title}${chunkLabel}]\n${item.summary}`
    }
    const typeLabel = item.type.replace(/_/g, ' ')
    const title = item.title ?? 'Untitled'
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
  discoveryEntries?: DiscoveryEntryRow[]
  includeDiscoveryEntries?: boolean
  discoveryParticipant?: string | null
  customerInsights?: CustomerInsightRow[]
  includeCustomerInsights?: boolean
  customerHubContactComms?: ContactCommunicationRow[]
  includeCustomerHubContact?: boolean
  contactInsights?: CustomerInsightRow[]
  segmentComms?: ContactCommunicationRow[]
  segmentInsights?: CustomerInsightRow[]
  hubSegment?: string
  retrievedContext?: RetrievedContext[]
  fileFullTexts?: Array<{ title: string; content: string }>
}): string {
  const {
    brand, businessPlanSections, personas, productSections, productFeatures,
    currentGoals, filedDocs, competitors, socialProof, narratives, terminology,
    kpiDefinitions, kpiSnapshot,
    includeBrand, includeBusinessPlan, includePersonas, includeProduct,
    includeCurrentGoals, includeFiledDocs, includeCompetitors, includeSocialProof,
    includeKpis, projectMaterials, includeProjectMaterials,
    discoveryEntries, includeDiscoveryEntries, discoveryParticipant,
    customerInsights, includeCustomerInsights,
    customerHubContactComms, includeCustomerHubContact, contactInsights,
    segmentComms, segmentInsights, hubSegment,
    retrievedContext, fileFullTexts,
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

  if (fileFullTexts && fileFullTexts.length > 0) {
    lines.push('[PROJECT FILES — full content]')
    lines.push('The following files are attached to this project. Read them in full before answering.')
    lines.push('')
    for (const file of fileFullTexts) {
      lines.push(`--- ${file.title} ---`)
      lines.push(file.content)
      lines.push('')
    }
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

  if (includeDiscoveryEntries && discoveryEntries && discoveryEntries.length > 0) {
    const heading = discoveryParticipant
      ? `[CUSTOMER FILE — ${discoveryParticipant}]`
      : '[CUSTOMER DISCOVERY ENTRIES]'
    lines.push(heading)
    if (discoveryParticipant) {
      lines.push(`All of the following are recorded interactions and feedback from ${discoveryParticipant}.`)
      lines.push('Use this context to answer questions about their experience, needs, and feedback patterns.')
    } else {
      lines.push('The following are customer discovery entries (interviews, emails, surveys, observations).')
      lines.push('Use these to ground answers in real customer feedback.')
    }
    discoveryEntries.slice(0, 30).forEach((entry) => {
      const date = entry.entry_date ? ` (${entry.entry_date})` : ''
      const src = entry.source ? ` · ${entry.source}` : ''
      const who = !discoveryParticipant && entry.participant ? ` — ${entry.participant}` : ''
      lines.push(`- [${entry.entry_type}${src}${who}${date}] ${entry.raw_content.slice(0, 800)}`)
      if (entry.key_quote_1) lines.push(`  Key quote: "${entry.key_quote_1}"`)
      if (entry.jtbd) lines.push(`  JTBD: ${entry.jtbd}`)
      const row = entry as Record<string, unknown>
      if (row.wtp_signal && row.wtp_signal !== 'none') {
        const prices = Array.isArray(row.wtp_price_points) && row.wtp_price_points.length > 0
          ? ` — prices mentioned: ${(row.wtp_price_points as number[]).join(', ')}`
          : ''
        lines.push(`  WTP signal: ${row.wtp_signal}${prices}`)
      }
      if (typeof row.problem_severity === 'number') lines.push(`  Problem severity: ${row.problem_severity}/5`)
      if (typeof row.adoption_willingness === 'number') lines.push(`  Adoption willingness: ${row.adoption_willingness}/5`)
      if (Array.isArray(row.tags) && (row.tags as string[]).length > 0) lines.push(`  Tags: ${(row.tags as string[]).join(', ')}`)
    })
    lines.push('')
  }

  if (includeCustomerInsights && customerInsights && customerInsights.length > 0) {
    lines.push('[CUSTOMER INSIGHTS — validated learnings from the field]')
    lines.push('These are structured learnings extracted from customer communications and research.')
    lines.push('Use them to ground answers in real signal from customers.')
    customerInsights.slice(0, 25).forEach((insight) => {
      const src = insight.source_contact_name ? ` (from ${insight.source_contact_name})` : ''
      const category = insight.category.replace(/_/g, ' ')
      lines.push(`- [${category} · ${insight.impact} impact] ${insight.content}${src}`)
    })
    lines.push('')
  }

  if (includeCustomerHubContact && (customerHubContactComms?.length || contactInsights?.length)) {
    const contactName = customerHubContactComms?.[0]?.contact_name ?? 'this contact'
    lines.push(`[CONTACT FILE — ${contactName}]`)
    lines.push(`Everything below is specific to ${contactName}. Use it to draft replies, understand their needs, and build a complete picture of their journey.`)
    lines.push('')

    if (customerHubContactComms && customerHubContactComms.length > 0) {
      lines.push('Communications:')
      customerHubContactComms.slice(0, 20).forEach((comm) => {
        const date = comm.sent_at ? ` (${comm.sent_at.slice(0, 10)})` : ''
        const subject = comm.subject ? ` · ${comm.subject}` : ''
        const dir = comm.direction === 'inbound' ? '→ Received' : comm.direction === 'outbound' ? '← Sent' : '📝 Note'
        lines.push(`- [${dir} · ${comm.channel}${subject}${date}] ${comm.content.slice(0, 600)}`)
      })
      lines.push('')
    }

    if (contactInsights && contactInsights.length > 0) {
      lines.push('Insights linked to this contact:')
      contactInsights.slice(0, 15).forEach((insight) => {
        const category = insight.category.replace(/_/g, ' ')
        const seg = insight.source_segment ? ` · from ${insight.source_segment.replace(/_/g, ' ')} cohort` : ''
        lines.push(`- [${category} · ${insight.impact} impact${seg}] ${insight.content}`)
      })
      lines.push('')
    }
  }

  if (hubSegment && (segmentInsights?.length || segmentComms?.length)) {
    const segLabel = hubSegment.replace(/_/g, ' ')
    lines.push(`[COHORT FILE — ${segLabel}]`)
    lines.push(`Everything below is specific to the ${segLabel} segment. Use it to analyse patterns, identify blockers, and answer questions about this cohort.`)
    lines.push('')

    if (segmentInsights && segmentInsights.length > 0) {
      lines.push('Captured insights for this cohort:')
      segmentInsights.slice(0, 40).forEach((insight) => {
        const from = insight.source_contact_name ? ` · ${insight.source_contact_name}` : ''
        const category = insight.category.replace(/_/g, ' ')
        lines.push(`- [${category} · ${insight.impact} impact${from}] ${insight.content}`)
      })
      lines.push('')
    }

    if (segmentComms && segmentComms.length > 0) {
      lines.push('Recent communications with contacts in this cohort:')
      segmentComms.slice(0, 20).forEach((comm) => {
        const date = comm.sent_at ? ` (${comm.sent_at.slice(0, 10)})` : ''
        const who = comm.contact_name ? ` · ${comm.contact_name}` : ''
        const subject = comm.subject ? ` · ${comm.subject}` : ''
        const dir = comm.direction === 'inbound' ? '→ Received' : comm.direction === 'outbound' ? '← Sent' : '📝 Note'
        lines.push(`- [${dir}${who}${subject}${date}] ${comm.content.slice(0, 400)}`)
      })
      lines.push('')
    }
  }

  lines.push('Use the company context above to give grounded, relevant answers.')
  lines.push('When you do not know something, say so — do not make up company details.')

  return lines.join('\n')
}

// ----------------------------------------------------------------
// Extract insights from a chat conversation
// ----------------------------------------------------------------

export function buildExtractInsightsPrompt(params: {
  conversationText: string
  scope: string
}): string {
  const { conversationText, scope } = params

  const lines: string[] = []

  lines.push(`You are extracting product insights from a conversation about ${scope}.`)
  lines.push('')
  lines.push('Read the conversation below and extract 3-8 concrete, actionable product insights.')
  lines.push('Focus on: pain points, feature requests, churn signals, usage patterns, and validated learnings.')
  lines.push('Skip meta-commentary about the conversation itself.')
  lines.push('')
  lines.push('Return a JSON array. Each item:')
  lines.push('  - content: the insight in plain English (1-2 sentences, specific and actionable)')
  lines.push('  - category: one of "pain_point", "feature_request", "praise", "objection", "churn_signal", "usage_pattern", "market_insight"')
  lines.push('  - impact: one of "high", "medium", "low"')
  lines.push('')
  lines.push('Output ONLY valid JSON — no preamble, no code fence.')
  lines.push('')
  lines.push('[CONVERSATION]')
  lines.push(conversationText.slice(0, 12000))
  lines.push('')
  lines.push('JSON array:')

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
  fileFullTexts?: Array<{ title: string; content: string }>
}): string {
  const {
    brand, businessPlanSections, personas, productSections, productFeatures,
    currentGoals, competitors, socialProof, narratives, terminology,
    kpiDefinitions, kpiSnapshot, topPerformers,
    contentTypeName, basePrompt, customRules, cadence, author,
    projectMaterials, retrievedContext, fileFullTexts,
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

  lines.push(`You are a world-class marketer and brand strategist creating ${contentTypeName} content for ${brand.company_name}.`)
  lines.push(`You think like a CMO who has built iconic brands — every piece of content earns attention, drives a clear outcome, and sounds unmistakably on-brand.`)
  lines.push(`You write with specificity, confidence, and creative conviction. You never produce generic, filler, or safe-but-forgettable output.`)
  lines.push(`Your standard: if this content appeared in a feed, would it stop the scroll? If published, would it move the business forward?`)
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

  if (fileFullTexts && fileFullTexts.length > 0) {
    lines.push('[PROJECT FILES — full content]')
    lines.push('The following files are attached to this project. Use them as primary source material and evidence for the content. Read them in full.')
    lines.push('')
    for (const file of fileFullTexts) {
      lines.push(`--- ${file.title} ---`)
      lines.push(file.content)
      lines.push('')
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

  const todayLabel = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })

  const lines: string[] = []

  lines.push(`You are drafting a ${documentType} based on the following conversation.`)
  lines.push(`Today's date is ${todayLabel}.`)
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
  lines.push('Do not include a date header or footer in the document.')
  lines.push('Output only the document content — no preamble, no explanation.')

  return lines.join('\n')
}

export function buildDocumentChatSystemPrompt(params: {
  documentTitle: string
  documentType: string
  documentContent: string
  brand: { company_name: string; voice: string | null } | null
}): string {
  const { documentTitle, documentType, documentContent, brand } = params

  const lines: string[] = []

  lines.push(`You are an expert editor and advisor helping to discuss, refine, and improve a document.`)
  if (brand) {
    lines.push(`This document belongs to ${brand.company_name}.`)
    lines.push(`Write and suggest edits in the company voice: ${brand.voice || 'clear and professional'}.`)
  }
  lines.push('')
  lines.push(`[DOCUMENT: ${documentTitle}]`)
  lines.push(`Type: ${documentType}`)
  lines.push('')
  lines.push(documentContent)
  lines.push('')
  lines.push('---')
  lines.push('Your role:')
  lines.push('- Answer questions about the document content')
  lines.push('- Discuss ideas and improvements')
  lines.push('- When asked to rewrite, edit, or improve the document (or any part of it), provide the revised full document wrapped in <replacement> tags like this:')
  lines.push('')
  lines.push('<replacement>')
  lines.push('...full revised document content here...')
  lines.push('</replacement>')
  lines.push('')
  lines.push('The replacement block should contain the complete updated document in markdown, not just the changed section.')
  lines.push('Only include a replacement block when explicitly providing a revised version. For discussion and questions, reply normally.')

  return lines.join('\n')
}

export function buildOutputChatSystemPrompt(params: {
  outputType: string
  brief: string
  content: string
  brand: { company_name: string; voice: string | null } | null
}): string {
  const { outputType, brief, content, brand } = params

  const lines: string[] = []

  lines.push(`You are an expert editor and advisor helping to discuss, refine, and improve a project output.`)
  if (brand) {
    lines.push(`This output belongs to ${brand.company_name}.`)
    lines.push(`Write and suggest edits in the company voice: ${brand.voice || 'clear and professional'}.`)
  }
  lines.push('')
  lines.push(`[OUTPUT TYPE: ${outputType}]`)
  lines.push(`[BRIEF: ${brief}]`)
  lines.push('')
  lines.push(content)
  lines.push('')
  lines.push('---')
  lines.push('Your role:')
  lines.push('- Answer questions about the output content')
  lines.push('- Discuss ideas and improvements')
  lines.push('- When asked to rewrite, edit, or improve the output (or any part of it), provide the full revised content wrapped in <replacement> tags like this:')
  lines.push('')
  lines.push('<replacement>')
  lines.push('...full revised content here...')
  lines.push('</replacement>')
  lines.push('')
  lines.push('The replacement block must contain the complete updated output in markdown, not just the changed section.')
  lines.push('Only include a replacement block when explicitly providing a revised version. For discussion and questions, reply normally.')

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

// ─── Playbook: AI Writing Polish ─────────────────────────────────────────────

/** Company fields for playbook AI (from brand_context + related rows). */
export function buildPlaybookCompanyContextBlock(params: {
  brand: {
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
  } | null
  terminology: TerminologyRow[]
  narratives: BrandNarrativeRow[]
}): string {
  const { brand, terminology, narratives } = params
  const lines: string[] = []

  if (brand) {
    lines.push('[COMPANY CONTEXT]')
    if (brand.company_name?.trim()) lines.push(`Company: ${brand.company_name.trim()}`)
    if (brand.mission?.trim()) lines.push(`Mission: ${brand.mission.trim()}`)
    if (brand.vision?.trim()) lines.push(`Vision: ${brand.vision.trim()}`)
    if (brand.north_star?.trim()) lines.push(`North star: ${brand.north_star.trim()}`)
    if (brand.voice?.trim()) lines.push(`Brand voice: ${brand.voice.trim()}`)
    if (brand.tone?.trim()) lines.push(`Brand tone: ${brand.tone.trim()}`)
    if (brand.pillars?.trim()) lines.push(`Messaging pillars: ${brand.pillars.trim()}`)
    if (brand.target_audience?.trim()) lines.push(`Target audience: ${brand.target_audience.trim()}`)
    if (brand.values?.trim()) lines.push(`Values: ${brand.values.trim()}`)
    if (brand.guardrails?.trim()) {
      lines.push('')
      lines.push('[GUARDRAILS — never violate these]')
      lines.push(brand.guardrails.trim())
    }
  }

  const narrativesBlock = buildNarrativesBlock(narratives)
  if (narrativesBlock) {
    lines.push('')
    lines.push('[CORE NARRATIVES — align wording and stories where relevant]')
    lines.push(narrativesBlock)
  }

  const terminologyBlock = buildTerminologyBlock(terminology)
  if (terminologyBlock) {
    lines.push('')
    lines.push('[TERMINOLOGY — use preferred terms consistently]')
    lines.push(terminologyBlock)
  }

  return lines.join('\n').trim()
}

export function buildPlaybookPolishPrompt(params: {
  title: string
  category: string
  content: string
  brandVoice: string | null
  /** Optional user instructions (e.g. "shorten", "add a checklist", "more formal"). */
  instruction?: string | null
  /** Pre-formatted block from buildPlaybookCompanyContextBlock (brand, narratives, terminology). */
  companyContextBlock?: string | null
}): string {
  const { title, category, content, brandVoice, instruction, companyContextBlock } = params
  const userInstruction = instruction?.trim() ?? ''
  const companyBlock = companyContextBlock?.trim() ?? ''

  const lines: string[] = []

  lines.push(`You are a world-class technical writer. You are editing a team playbook titled "${title}" in the "${category}" category.`)
  if (brandVoice) lines.push(`Primary voice reference: ${brandVoice}`)
  lines.push('')

  if (companyBlock) {
    lines.push(companyBlock)
    lines.push('')
    lines.push('Use the company context above when choosing language, terms, and emphasis. Do not invent company facts not supported by that context.')
    lines.push('')
  }

  if (userInstruction) {
    lines.push('[USER INSTRUCTIONS — follow these first]')
    lines.push(userInstruction)
    lines.push('')
    lines.push('Apply the user instructions above. Where they conflict with the generic rules below, prioritise the user instructions.')
    lines.push('')
  } else {
    lines.push('Your job is to polish the writing without changing the meaning or removing any steps.')
    lines.push('')
  }

  lines.push('[GENERAL RULES]')
  lines.push('- Fix grammar, spelling, and awkward phrasing')
  lines.push('- Make instructions clearer and more specific')
  lines.push('- Use active voice wherever possible')
  if (!userInstruction) {
    lines.push('- Keep step-by-step structure intact — do not reorganise or add new sections unless the user asked')
    lines.push('- Do not add steps that were not already implied')
  } else {
    lines.push('- Restructure or expand only when the user instructions require it')
  }
  lines.push('- Preserve markdown where sensible (headings, bullets, numbered lists)')
  lines.push('- Output ONLY the revised content — no preamble, no explanation')
  lines.push('')
  lines.push('[CURRENT CONTENT]')
  lines.push(content.slice(0, 20000))

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

  return `You are a world-class CEO and strategic operator with 20+ years building category-defining companies. You write business plans with precision, authority, and investor-grade clarity — no filler, no generic language, no corporate speak.

SECTION TO WRITE: ${ctx.fieldLabel}
WHAT THIS SECTION COVERS: ${ctx.fieldHint}
${conflictNote}
${resolvedBlock ? `CONFLICT RESOLUTIONS — treat these as authoritative for their topics, overriding any contradictory text in the documents below:\n${resolvedBlock}\n` : ''}
${otherFields ? `COMPANY CONTEXT (other completed sections):\n${otherFields}\n` : ''}
${docsBlock ? `UPLOADED COMPANY DOCUMENTS:\n${docsBlock}\n` : ''}
---

Write the "${ctx.fieldLabel}" section of this business plan.

FORMATTING RULES:
- Use markdown formatting — it will be rendered properly.
- For sections covering multiple distinct items (problems, steps, channels, features, risks, etc.): write a short intro sentence, then 3–5 bullets using "- **Label:** description" format.
- Each bullet: "- **Short label:** One tight sentence with a specific detail or example." Max 2 lines per bullet.
- Use "## Sub-heading" for a section sub-heading only if the section genuinely has 2+ named sub-groups.
- Use plain prose (2–4 sentences, no bullets) ONLY for single-idea narrative sections like executive summary.
- No trailing paragraph after bullets — end on the last bullet.

QUALITY STANDARD:
- Specific to this company — never generic placeholders
- Active voice, confident tone — write as a founder who knows their market cold
- If a number, metric, or concrete example exists in the context, use it
- Investor-ready: if a VC read this, it should be immediately clear and credible
- No preamble, no label, no explanation — only the section content itself

Respond with ONLY the section content.`
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

export type ProjectMaterialForDeliverablePrompt = {
  material_type: string
  title: string | null
  content: string | null
  file_name: string | null
  link_url: string | null
}

function buildProjectMaterialsAndPlanBlocks(
  materials: ProjectMaterialForDeliverablePrompt[],
  businessPlanSections: BusinessPlanSections | null,
): { materialsBlock: string | null; planBlock: string | null } {
  const materialsBlock = materials.length > 0
    ? materials
        .map((m) => {
          if (m.material_type === 'file') return `[FILE] ${m.title ?? m.file_name ?? 'Uploaded file'} (full content included in PROJECT FILES section below)`
          if (m.content) return `[${m.material_type.toUpperCase()}] ${m.title ?? 'Note'}:\n${m.content.slice(0, 3000)}`
          if (m.link_url) return `[LINK] ${m.title ?? m.link_url}: ${m.link_url}`
          return null
        })
        .filter(Boolean)
        .join('\n\n')
    : null

  const planBlock = businessPlanSections
    ? BUSINESS_PLAN_SECTIONS
        .filter((s) => (businessPlanSections[s.key] ?? '').trim())
        .map((s) => `${s.label}: ${businessPlanSections[s.key].trim()}`)
        .join('\n')
    : null

  return { materialsBlock, planBlock }
}

/**
 * System prompt for multi-turn project deliverable generation (chat until save).
 * User messages carry the request and refinements; materials and project context stay here.
 */
export function buildProjectOutputSessionSystemPrompt(params: {
  projectName: string
  projectDescription: string | null
  outputType: string
  materials: ProjectMaterialForDeliverablePrompt[]
  businessPlanSections: BusinessPlanSections | null
  previousOutputs?: Array<{ brief: string; content: string; createdAt: string }>
  fileFullTexts?: Array<{ title: string; content: string }>
}): string {
  const { projectName, projectDescription, outputType, materials, businessPlanSections, previousOutputs, fileFullTexts } = params
  const { materialsBlock, planBlock } = buildProjectMaterialsAndPlanBlocks(materials, businessPlanSections)

  const fileFullTextsBlock = fileFullTexts && fileFullTexts.length > 0
    ? fileFullTexts.map((f) => `--- ${f.title} ---\n${f.content}`).join('\n\n')
    : null

  const previousOutputsBlock = previousOutputs && previousOutputs.length > 0
    ? previousOutputs
        .map((o, i) => {
          const label = o.brief.trim().slice(0, 150)
          // Cap content at 2000 chars per output to stay within token budget
          const body = o.content.trim().slice(0, 2000) + (o.content.length > 2000 ? '\n…(truncated)' : '')
          return `[PREVIOUS OUTPUT ${i + 1}] ${label}\n${body}`
        })
        .join('\n\n')
    : null

  const isEmailDraft = outputType.trim().toLowerCase() === 'email draft'

  const emailBlock = isEmailDraft
    ? `
[EMAIL DRAFT — follow when producing the final draft]
- Write a professional email the user can send or adapt. Not a subject line of marketing fluff unless the brief asks for it.
- After "Here's your draft:" (or "Here's your updated draft:"), structure the body in markdown:
  - First line: **Subject:** followed by a specific, compelling subject (not generic).
  - Then the email body: greeting, short paragraphs, one clear ask or next step, sign-off appropriate to the relationship (adjust if the user specified tone or formality).
- Match audience and intent from the conversation; infer from project context when not stated.
- Keep mobile readability in mind: short paragraphs, scannable structure.
`
    : ''

  const deliverableShape = isEmailDraft
    ? 'the full email draft (subject + body in markdown as above)'
    : `a complete ${outputType} using markdown: ## for section headings, - for bullets, **bold** for key terms or actions`

  return `You are a sharp, experienced professional helping a team produce project deliverables. You are clear, specific, well-structured, and immediately actionable.

PROJECT: ${projectName}${projectDescription ? `\nCONTEXT: ${projectDescription}` : ''}

DELIVERABLE TYPE: ${outputType}
${fileFullTextsBlock ? `\nPROJECT FILES — full content (read in full before answering):\n${fileFullTextsBlock}` : ''}
${materialsBlock ? `\nPROJECT MATERIALS (use as source and reference):\n${materialsBlock}` : ''}
${planBlock ? `\nBUSINESS CONTEXT (background reference):\n${planBlock}` : ''}
${previousOutputsBlock ? `\nPREVIOUSLY GENERATED OUTPUTS FOR THIS PROJECT (read for context, avoid repeating verbatim):\n${previousOutputsBlock}` : ''}
${emailBlock}
---

[PROCESS — follow this exactly]

Step 1 — When the user sends their first message (or continues the conversation):
- Read what they want. Extract every detail they already provided.
- Only ask about information that is genuinely missing and that you cannot reasonably infer from project materials or context.
- Do NOT ask about anything they already told you.
- If you need clarification, ask concise questions (you may use a short numbered list). If you have enough to proceed, skip questions.

Step 2 — Producing a deliverable draft:
- When you have enough information, produce ${deliverableShape}.
- Begin that message with the line "Here's your draft:" on its own line, then the full content below it (not a summary or outline).

Step 3 — Refinement:
- Accept feedback and revise. Each revised full version begins with "Here's your updated draft:" on its own line.
- Output the complete revised draft each time, not only the changed parts.

[FORMATTING]
- Questions and short replies: plain text is fine.
- Deliverable drafts (after the marker line): use markdown appropriate to the deliverable type. Be specific and concrete — no generic filler.
- Length: match the deliverable type (e.g. briefs stay tight; reports can be thorough).`
}

export function buildSectionChatSystemPrompt(params: {
  sectionKey: string
  sectionLabel: string
  sectionDescription: string
  sectionText: string
  otherSections: Array<{ label: string; text: string }>
  knowledgeDocs: KnowledgeDoc[]
  brand: { company_name: string; mission?: string | null; voice?: string | null } | null
}): string {
  const {
    sectionLabel,
    sectionDescription,
    sectionText,
    otherSections,
    knowledgeDocs,
    brand,
  } = params

  const lines: string[] = []

  lines.push(`You are helping review and improve the "${sectionLabel}" section of a company's business plan.`)
  lines.push('Be direct, specific, and grounded in the company context provided below.')
  lines.push('')

  lines.push('[SECTION BEING DISCUSSED]')
  lines.push(`Title: ${sectionLabel}`)
  lines.push(`Description: ${sectionDescription}`)
  lines.push('')
  if (sectionText.trim()) {
    lines.push('Current content:')
    lines.push(sectionText.trim())
  } else {
    lines.push('Current content: (not yet written)')
  }
  lines.push('')

  if (brand?.company_name) {
    lines.push('[COMPANY]')
    lines.push(`Name: ${brand.company_name}`)
    if (brand.mission?.trim()) lines.push(`Mission: ${brand.mission.trim()}`)
    if (brand.voice?.trim()) lines.push(`Brand voice: ${brand.voice.trim()}`)
    lines.push('')
  }

  const filledOtherSections = otherSections.filter((s) => s.text.trim().length > 0)
  if (filledOtherSections.length > 0) {
    lines.push('[OTHER BUSINESS PLAN SECTIONS]')
    lines.push('Use these for context and consistency checks only — do not rewrite them.')
    for (const s of filledOtherSections) {
      const truncated = s.text.trim().slice(0, 500)
      lines.push(`${s.label}: ${truncated}${s.text.length > 500 ? '…' : ''}`)
    }
    lines.push('')
  }

  if (knowledgeDocs.length > 0) {
    lines.push('[COMPANY KNOWLEDGE DOCUMENTS]')
    lines.push('Uploaded documents — use these as ground truth for company facts.')
    for (const doc of knowledgeDocs) {
      lines.push(`--- ${doc.fileName} ---`)
      lines.push(doc.text.slice(0, 3000))
      if (doc.text.length > 3000) lines.push('(truncated)')
    }
    lines.push('')
  }

  lines.push('[INSTRUCTIONS]')
  lines.push(`- You can analyse whether the section is accurate, complete, and consistent with the rest of the plan.`)
  lines.push(`- You can suggest improvements or write a full replacement when asked.`)
  lines.push(`- When you provide a replacement version of the section, wrap the new text in <replacement> and </replacement> tags.`)
  lines.push(`- Only the section body goes inside those tags — no headings, no labels, no preamble.`)
  lines.push(`- Only use <replacement> tags when providing a full replacement body. Never use them for analysis, partial suggestions, or discussion.`)
  lines.push(`- The user can click "Apply to section" to replace the current content with your replacement.`)

  return lines.join('\n')
}

// ----------------------------------------------------------------
// Cohort document insight extraction
// ----------------------------------------------------------------

export interface ExtractedInsightDraft {
  content: string
  category: 'pain_point' | 'feature_request' | 'praise' | 'objection' | 'churn_signal' | 'usage_pattern' | 'market_insight'
  impact: 'high' | 'medium' | 'low'
}

export interface RespondentInsightResult {
  respondent_key?: string | null
  email: string | null
  name: string | null
  insights: ExtractedInsightDraft[]
}

export interface AttributedRespondent {
  respondent_key: string
  name: string | null
  email: string | null
  contact_id: string | null
  contact_name: string | null
}

export interface ConsolidatedInsightDraft {
  content: string
  category: ExtractedInsightDraft['category']
  impact: ExtractedInsightDraft['impact']
  respondent_keys: string[]
  attributed_respondents: AttributedRespondent[]
}

const SEGMENT_DISPLAY: Record<string, string> = {
  beta_user: 'beta users',
  free_user: 'free users',
  customer: 'paying customers',
  power_user: 'power users',
  prospect: 'prospects',
  churned: 'churned users',
  other: 'users',
}

export function buildCohortExtractionPrompt(params: {
  documentText: string
  segment: string
  fileName: string
}): string {
  const { documentText, segment, fileName } = params
  const segmentLabel = SEGMENT_DISPLAY[segment] ?? 'users'

  const lines: string[] = []

  lines.push('You are a customer intelligence analyst. Extract actionable product insights from the following document.')
  lines.push('')
  lines.push(`The document was submitted by ${segmentLabel} (file: "${fileName}").`)
  lines.push('')
  lines.push('Return a JSON array of insight objects. Each object must have:')
  lines.push('  - content: a clear, specific, actionable insight in plain English (1-3 sentences)')
  lines.push('  - category: one of "pain_point", "feature_request", "praise", "objection", "churn_signal", "usage_pattern", "market_insight"')
  lines.push('  - impact: one of "high", "medium", "low"')
  lines.push('')
  lines.push('Rules:')
  lines.push('  - Extract distinct, non-redundant insights. Do not repeat the same idea.')
  lines.push('  - Write content in first-person voice as if quoting the learning: e.g. "Users drop off during step 3 of onboarding because the form is confusing."')
  lines.push('  - Be specific. Avoid vague insights like "users want a better experience."')
  lines.push('  - If the document is a survey, treat each distinct theme as a separate insight.')
  lines.push('  - Maximum 20 insights. Skip noise and filler responses.')
  lines.push('  - Assign "high" impact if the issue blocks core usage or is mentioned repeatedly.')
  lines.push('  - Assign "low" impact for minor or one-off mentions.')
  lines.push('  - Output ONLY valid JSON — no preamble, no explanation, no markdown code fence.')
  lines.push('')
  lines.push('[DOCUMENT]')
  lines.push(documentText.slice(0, 40000))
  if (documentText.length > 40000) lines.push('(truncated — document was too long)')
  lines.push('')
  lines.push('JSON array:')

  return lines.join('\n')
}

// ----------------------------------------------------------------
// Email draft generation
// ----------------------------------------------------------------

export interface EmailDraftResult {
  subject: string
  body: string
}

export function buildEmailDraftPrompt(params: {
  contactName: string
  contactSegment: string | null
  communicationHistory: Array<{
    direction: string
    channel: string
    subject: string | null
    content: string
    sent_at: string | null
  }>
  purpose: string
  additionalContext: string
  brandVoice: string
  brandTone: string
  companyName: string
}): string {
  const {
    contactName,
    contactSegment,
    communicationHistory,
    purpose,
    additionalContext,
    brandVoice,
    brandTone,
    companyName,
  } = params

  const lines: string[] = []

  lines.push(`You are drafting an outbound email from ${companyName} to their customer ${contactName}.`)
  if (contactSegment) lines.push(`${contactName} is a ${contactSegment.replace(/_/g, ' ')}.`)
  lines.push('')

  if (brandVoice || brandTone) {
    lines.push('[BRAND VOICE]')
    if (brandVoice) lines.push(`Voice: ${brandVoice}`)
    if (brandTone) lines.push(`Tone: ${brandTone}`)
    lines.push('')
  }

  if (communicationHistory.length > 0) {
    lines.push('[COMMUNICATION HISTORY — most recent first]')
    for (const comm of communicationHistory) {
      const when = comm.sent_at ? new Date(comm.sent_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : 'unknown date'
      const dir = comm.direction === 'inbound' ? `← ${contactName}` : comm.direction === 'outbound' ? '→ Sent' : '(note)'
      if (comm.subject) lines.push(`[${when}] ${dir} — ${comm.subject}`)
      else lines.push(`[${when}] ${dir}`)
      lines.push(comm.content.slice(0, 500))
      lines.push('---')
    }
    lines.push('')
  } else {
    lines.push('[No prior communication history]')
    lines.push('')
  }

  lines.push('[PURPOSE OF THIS EMAIL]')
  lines.push(purpose)
  lines.push('')

  if (additionalContext.trim()) {
    lines.push('[ADDITIONAL CONTEXT / INFO TO INCLUDE]')
    lines.push(additionalContext)
    lines.push('')
  }

  lines.push('Write a natural, professional email that:')
  lines.push('- Reads as a genuine personal email, not a marketing template')
  lines.push('- Continues naturally from the most recent conversation')
  lines.push('- Addresses the stated purpose clearly')
  lines.push('- Includes the additional context where relevant')
  lines.push('- Matches the brand voice and tone above')
  lines.push('- Is concise — no unnecessary padding')
  lines.push('')
  lines.push('Return ONLY valid JSON with these two fields, no preamble:')
  lines.push('{ "subject": "...", "body": "..." }')

  return lines.join('\n')
}

// ----------------------------------------------------------------
// Email refinement (iterative AI editing)
// ----------------------------------------------------------------

export function buildEmailRefinePrompt(params: {
  contactName: string
  currentSubject: string
  currentBody: string
  instruction: string
  brandVoice: string
  brandTone: string
  companyName: string
  chatContext?: Array<{ role: string; content: string; created_at: string }>
}): string {
  const { contactName, currentSubject, currentBody, instruction, brandVoice, brandTone, companyName, chatContext } = params
  const lines: string[] = []

  lines.push(`You are refining an outbound email from ${companyName} to their customer ${contactName}.`)
  lines.push('')

  if (brandVoice || brandTone) {
    lines.push('[BRAND VOICE]')
    if (brandVoice) lines.push(`Voice: ${brandVoice}`)
    if (brandTone) lines.push(`Tone: ${brandTone}`)
    lines.push('')
  }

  if (chatContext && chatContext.length > 0) {
    lines.push('[RECENT AI CHAT CONTEXT]')
    lines.push('The user had the following AI chat conversation about this contact. Use it as background if relevant to the refinement instruction.')
    lines.push('')
    for (const msg of chatContext) {
      const when = new Date(msg.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
      const speaker = msg.role === 'user' ? 'User' : 'AI'
      lines.push(`[${when}] ${speaker}: ${msg.content}`)
      lines.push('---')
    }
    lines.push('')
  }

  lines.push('[CURRENT EMAIL DRAFT]')
  lines.push(`Subject: ${currentSubject}`)
  lines.push('')
  lines.push(currentBody)
  lines.push('')

  lines.push('[REFINEMENT INSTRUCTION]')
  lines.push(instruction)
  lines.push('')

  lines.push('Rewrite the complete email incorporating the refinement instruction above.')
  lines.push('Preserve the original intent and structure unless explicitly instructed otherwise.')
  lines.push('Maintain the brand voice and tone throughout.')
  lines.push('Return ONLY valid JSON with these two fields, no preamble:')
  lines.push('{ "subject": "...", "body": "..." }')

  return lines.join('\n')
}

export function buildPerRespondentExtractionPrompt(params: {
  respondentsText: string
  segment: string
  fileName: string
}): string {
  const { respondentsText, segment, fileName } = params
  const segmentLabel = SEGMENT_DISPLAY[segment] ?? 'users'

  const lines: string[] = []

  lines.push('You are a world-class customer discovery analyst. Extract insights from a survey of individual respondents.')
  lines.push('')
  lines.push(`Segment: ${segmentLabel} | File: "${fileName}"`)
  lines.push('')
  lines.push('TASK: For every respondent listed below, produce 1–5 actionable insights.')
  lines.push('')
  lines.push('OUTPUT FORMAT — return a JSON array where each object has:')
  lines.push('  respondent_key  — copy exactly the key shown at the start of their section (e.g. "R1", "R7")')
  lines.push('  email           — their email, or null')
  lines.push('  name            — their name, or null')
  lines.push('  insights        — array of objects, each with:')
  lines.push('      content   : 1-2 sentence specific insight')
  lines.push('      category  : one of pain_point | feature_request | praise | objection | churn_signal | usage_pattern | market_insight')
  lines.push('      impact    : high | medium | low')
  lines.push('')
  lines.push('NON-NEGOTIABLE RULES:')
  lines.push('  1. Every respondent key that appears in [RESPONDENTS] MUST have an entry in your output. Zero exceptions.')
  lines.push('  2. If a respondent answered at least one question with anything other than blank/"N/A", produce at least 1 insight.')
  lines.push('     — A single word like "Yes", "No", "Hard", "2x/week" is enough to extract an insight about their situation.')
  lines.push('  3. Only use insights:[] when EVERY single answer field for that respondent is empty or "N/A".')
  lines.push('  4. Write insights as learnings, not summaries. "User trains 5x/week but struggles with recovery" not "User answered question about frequency".')
  lines.push('  5. high impact = directly blocks adoption or reveals a critical need. low = minor or one-off.')
  lines.push('  6. Output ONLY valid JSON. No preamble, no markdown, no explanation.')
  lines.push('')
  lines.push('[RESPONDENTS]')
  lines.push(respondentsText)
  lines.push('')
  lines.push('JSON array:')

  return lines.join('\n')
}

export function buildPatternConsolidationPrompt(params: {
  insightsText: string
  segment: string
  totalRespondents: number
}): string {
  const { insightsText, segment, totalRespondents } = params
  const segmentLabel = SEGMENT_DISPLAY[segment] ?? 'users'

  const lines: string[] = []

  lines.push('You are a senior product strategist consolidating customer insights across multiple survey respondents.')
  lines.push('')
  lines.push(`Below are insights extracted per-respondent from a ${segmentLabel} survey (${totalRespondents} respondents total).`)
  lines.push('Your job is to group similar insights into consolidated patterns, eliminate duplication, and credit the right respondents.')
  lines.push('')
  lines.push('Return a JSON array of consolidated patterns. Each pattern must have:')
  lines.push('  - content: A synthesised, specific, actionable insight representing the pattern (1-3 sentences).')
  lines.push('             Make it more precise and generalised than any single respondent\'s insight.')
  lines.push('  - category: one of "pain_point", "feature_request", "praise", "objection", "churn_signal", "usage_pattern", "market_insight"')
  lines.push('  - impact: one of "high", "medium", "low"')
  lines.push('  - respondent_keys: array of respondent IDs (e.g. ["R1", "R4", "R9"]) who expressed this pattern')
  lines.push('')
  lines.push('Rules:')
  lines.push('  - Think like a world-class customer discovery expert: your goal is the smallest set of patterns that faithfully represents the data.')
  lines.push('  - Merge insights if they share the same root problem or job-to-be-done — even if the surface wording differs.')
  lines.push('  - Only keep separate patterns if acting on them would require a genuinely different product decision.')
  lines.push('  - Do not create a pattern for every respondent. Most respondents should map to an existing pattern.')
  lines.push('  - Every respondent who contributed to a pattern must appear in respondent_keys.')
  lines.push('  - A respondent can appear in multiple patterns.')
  lines.push('  - Order patterns by frequency (most respondents first), then by severity.')
  lines.push('  - Assign "high" impact if seen by 3+ respondents OR clearly blocks core usage.')
  lines.push('  - Assign "medium" for 2 respondents or meaningful friction.')
  lines.push('  - Assign "low" for single mentions of minor or highly specific issues.')
  lines.push('  - Output ONLY valid JSON — no preamble, no explanation, no markdown code fence.')
  lines.push('')
  lines.push('[RESPONDENT INSIGHTS]')
  lines.push(insightsText.slice(0, 60000))
  lines.push('')
  lines.push('JSON array:')

  return lines.join('\n')
}

// ─────────────────────────────────────────────────────────────────────────────
// Persona Generation from Knowledge
// ─────────────────────────────────────────────────────────────────────────────

export interface GeneratedPersona {
  name: string
  tagline: string | null
  age_range: string | null
  job_title: string | null
  industry: string | null
  company_size: string | null
  location: string | null
  goals: string | null
  frustrations: string | null
  motivations: string | null
  behaviors: string | null
  values: string | null
  channels: string | null
  buying_triggers: string | null
  objections: string | null
  quote: string | null
}

export function buildGeneratePersonaPrompt(params: {
  knowledgeDocs: KnowledgeDoc[]
  existingPersonaNames: string[]
}): string {
  const { knowledgeDocs, existingPersonaNames } = params

  const docsBlock =
    knowledgeDocs.length > 0
      ? knowledgeDocs
          .map((d) => `--- ${d.fileName} ---\n${d.text.slice(0, 10000)}`)
          .join('\n\n')
      : '(No documents uploaded yet.)'

  const existingNote =
    existingPersonaNames.length > 0
      ? `Already-defined personas — do NOT generate these again: ${existingPersonaNames.join(', ')}\n`
      : ''

  return `You are a world-class product strategist and customer researcher. Your task is to identify ALL distinct customer archetypes that appear in the company's uploaded knowledge documents.

Read the documents carefully. Look for evidence of different types of customers or target users — different job titles, industries, company sizes, goals, frustrations, behaviours, and buying triggers. Each meaningfully different group of people who would use this product for different reasons, or who have different needs, should be a separate persona.

${existingNote}
Generate as many personas as you find genuine evidence for in the documents — typically 2–6. Do not pad with invented archetypes. Do not merge genuinely different groups. Every persona must be grounded in the documents.

For each persona, fill in every field you can find evidence for. Leave a field null only if there is truly no evidence in the docs.

[COMPANY DOCUMENTS]
${docsBlock}

Return ONLY a valid JSON array — no preamble, no markdown fence. Each item in the array must match this exact shape:
{
  "name": "Short archetype name, e.g. 'The Scaling Operator'",
  "tagline": "One-line summary of who they are and what they're trying to do",
  "age_range": "e.g. '28–40' or null",
  "job_title": "e.g. 'Head of Operations' or null",
  "industry": "e.g. 'B2B SaaS' or null",
  "company_size": "e.g. '50–200 employees' or null",
  "location": "e.g. 'US / UK' or null",
  "goals": "2–4 sentences describing what success looks like for them",
  "frustrations": "2–4 sentences on their biggest pain points and blockers",
  "motivations": "1–3 sentences on what drives their decisions",
  "behaviors": "1–3 sentences on how they research, evaluate, and work",
  "values": "1–2 sentences on what they care most about",
  "channels": "comma-separated list of channels they use, or null",
  "buying_triggers": "1–2 sentences on what causes them to seek a solution",
  "objections": "1–2 sentences on their typical hesitations",
  "quote": "A single first-person quote in their voice (1–2 sentences)"
}

JSON array:`
}

// ─────────────────────────────────────────────────────────────────────────────
// Persona Matching
// ─────────────────────────────────────────────────────────────────────────────

export interface PersonaMatchResult {
  matched_persona_id: string | null
  score: number                    // 0–100
  reasoning: string                // 2-4 sentences explaining the match
  suggest_new_persona: boolean     // true when score < 45
  new_persona_draft: {
    name: string
    tagline: string | null
    job_title: string | null
    industry: string | null
    goals: string | null
    frustrations: string | null
    motivations: string | null
    behaviors: string | null
    buying_triggers: string | null
    objections: string | null
    quote: string | null
  } | null
}

export function buildPersonaMatchPrompt(params: {
  contactName: string
  contactSegment: string | null
  contactNotes: string | null
  insights: Array<{ content: string; category: string; impact: string }>
  recentComms: Array<{ direction: string; channel: string; content: string }>
  personas: Array<{
    id: string
    name: string
    tagline: string | null
    job_title: string | null
    industry: string | null
    company_size: string | null
    goals: string | null
    frustrations: string | null
    motivations: string | null
    behaviors: string | null
    buying_triggers: string | null
    objections: string | null
    quote: string | null
  }>
}): string {
  const { contactName, contactSegment, contactNotes, insights, recentComms, personas } = params

  const lines: string[] = []

  lines.push('You are a world-class customer researcher. Your task is to match a customer contact to the best-fitting user persona from a predefined list.')
  lines.push('')
  lines.push('## Contact profile')
  lines.push(`Name: ${contactName}`)
  if (contactSegment) lines.push(`Segment: ${contactSegment.replace(/_/g, ' ')}`)
  if (contactNotes) lines.push(`Notes: ${contactNotes}`)
  lines.push('')

  if (insights.length > 0) {
    lines.push('### Insights from this contact')
    insights.forEach((ins, i) => {
      lines.push(`${i + 1}. [${ins.category} / ${ins.impact}] ${ins.content}`)
    })
    lines.push('')
  }

  if (recentComms.length > 0) {
    lines.push('### Recent communications')
    recentComms.forEach((comm, i) => {
      lines.push(`${i + 1}. [${comm.direction} ${comm.channel}] ${comm.content.slice(0, 300)}${comm.content.length > 300 ? '…' : ''}`)
    })
    lines.push('')
  }

  lines.push('## Available personas')
  personas.forEach((p) => {
    lines.push(`### Persona ID: ${p.id}`)
    lines.push(`Name: ${p.name}`)
    if (p.tagline) lines.push(`Summary: ${p.tagline}`)
    if (p.job_title) lines.push(`Role: ${p.job_title}`)
    if (p.industry) lines.push(`Industry: ${p.industry}`)
    if (p.goals) lines.push(`Goals: ${p.goals}`)
    if (p.frustrations) lines.push(`Frustrations: ${p.frustrations}`)
    if (p.motivations) lines.push(`Motivations: ${p.motivations}`)
    if (p.behaviors) lines.push(`Behaviours: ${p.behaviors}`)
    if (p.buying_triggers) lines.push(`Buying triggers: ${p.buying_triggers}`)
    if (p.objections) lines.push(`Objections: ${p.objections}`)
    if (p.quote) lines.push(`Quote: "${p.quote}"`)
    lines.push('')
  })

  lines.push('## Instructions')
  lines.push('1. Analyse the contact\'s insights, communications, and notes to understand who they really are.')
  lines.push('2. Compare against each persona. Consider goals, frustrations, behaviours, job-to-be-done, and communication style.')
  lines.push('3. Choose the single best-matching persona. Assign a score 0–100 where:')
  lines.push('   - 80–100: Very strong match — contact clearly fits this persona')
  lines.push('   - 60–79: Good match — most key attributes align')
  lines.push('   - 45–59: Partial match — some overlap but notable differences')
  lines.push('   - 0–44: Weak match — contact does not fit any existing persona well')
  lines.push('4. If score < 45, set suggest_new_persona: true and fill in new_persona_draft with a new persona that fits this contact.')
  lines.push('   The new persona should represent a broader archetype, not just this one person.')
  lines.push('5. Write 2-4 sentences of reasoning explaining why you chose (or did not match) this persona.')
  lines.push('')
  lines.push('Return ONLY valid JSON matching this exact shape — no preamble, no markdown fence:')
  lines.push('{')
  lines.push('  "matched_persona_id": "<uuid or null>",')
  lines.push('  "score": <0-100>,')
  lines.push('  "reasoning": "<2-4 sentences>",')
  lines.push('  "suggest_new_persona": <true|false>,')
  lines.push('  "new_persona_draft": <object or null>')
  lines.push('}')

  return lines.join('\n')
}

// -------------------------------------------------------
// Meeting Intelligence
// -------------------------------------------------------

export interface MeetingProcessingProject {
  id: string
  name: string
  description: string | null
}

export interface MeetingProcessingMember {
  user_id: string
  full_name: string | null
}

/**
 * Builds the prompt for extracting structured intelligence from a meeting transcript.
 * Returns a JSON-shaped response with decisions, actions, questions, and project suggestions.
 */
export function buildMeetingProcessingPrompt(params: {
  transcript: string
  attendees: MeetingProcessingMember[]
  orgProjects: MeetingProcessingProject[]
}): string {
  const { transcript, attendees, orgProjects } = params
  const lines: string[] = []

  lines.push('You are an expert meeting analyst. Your task is to extract structured intelligence from a meeting transcript and suggest where that information belongs in a project management system.')
  lines.push('')

  if (attendees.length > 0) {
    lines.push('## Meeting attendees')
    attendees.forEach((a) => {
      lines.push(`- ${a.full_name ?? 'Unknown'} (id: ${a.user_id})`)
    })
    lines.push('')
  }

  if (orgProjects.length > 0) {
    lines.push('## Active projects in the organisation')
    lines.push('When suggesting project routing, use the exact project_id values listed here.')
    orgProjects.forEach((p) => {
      lines.push(`- id: ${p.id} | name: ${p.name}${p.description ? ` | description: ${p.description}` : ''}`)
    })
    lines.push('')
  }

  lines.push('## Meeting transcript')
  lines.push(transcript.trim())
  lines.push('')
  lines.push('---')
  lines.push('')
  lines.push('Extract the following from the transcript. Respond with a single valid JSON object — no markdown fences, no explanatory text outside the JSON.')
  lines.push('')
  lines.push('JSON schema:')
  lines.push('{')
  lines.push('  "summary": "<2-4 sentence summary of the meeting>",')
  lines.push('  "decisions": [')
  lines.push('    { "text": "<decision made>", "owner": "<name of person responsible, or null>" }')
  lines.push('  ],')
  lines.push('  "action_items": [')
  lines.push('    { "text": "<action to be taken>", "assignee_name": "<name of person assigned, or null>" }')
  lines.push('  ],')
  lines.push('  "open_questions": [')
  lines.push('    { "text": "<unresolved question or parking lot item>" }')
  lines.push('  ],')
  lines.push('  "project_suggestions": [')
  lines.push('    {')
  lines.push('      "project_id": "<exact project id from the list above>",')
  lines.push('      "project_name": "<project name>",')
  lines.push('      "rationale": "<1-2 sentences explaining why this content belongs in this project>",')
  lines.push('      "relevant_decisions": [<0-based indices into the decisions array>],')
  lines.push('      "relevant_actions": [<0-based indices into the action_items array>]')
  lines.push('    }')
  lines.push('  ]')
  lines.push('}')
  lines.push('')
  lines.push('Rules:')
  lines.push('- Only suggest projects from the provided list. If no projects are a good fit, return an empty project_suggestions array.')
  lines.push('- A decision or action may appear in multiple project suggestions if genuinely relevant to each.')
  lines.push('- If a decision or action is general housekeeping with no project relevance, omit it from project_suggestions.')
  lines.push('- Only include decisions, actions, and questions that are explicitly stated or strongly implied in the transcript.')
  lines.push('- If the transcript contains no discernible decisions, return an empty decisions array.')
  lines.push('- Assignee names must match names mentioned in the transcript — do not infer.')

  return lines.join('\n')
}

export interface MeetingChatBrandContext {
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

export interface MeetingChatMeetingContext {
  title: string
  meetingDate: string | null
  summary: string | null
  decisionsJson: string
  actionItemsJson: string
  openQuestionsJson: string
  transcriptExcerpt: string
}

/**
 * System prompt for Discuss: Q&A and drafting against processed meeting notes.
 * Receives optional pre-serialised company context blocks built by the route.
 */
export function buildMeetingChatSystemPrompt(params: {
  brand: MeetingChatBrandContext | null
  meeting: MeetingChatMeetingContext
  // Optional company context — each is a plain-text block ready to embed
  businessPlanText?: string
  personasText?: string
  productText?: string
  featuresText?: string
  goalsText?: string
  competitorsText?: string
  narrativesText?: string
  terminologyText?: string
}): string {
  const {
    brand,
    meeting,
    businessPlanText,
    personasText,
    productText,
    featuresText,
    goalsText,
    competitorsText,
    narrativesText,
    terminologyText,
  } = params
  const lines: string[] = []

  lines.push('You are a thoughtful assistant helping a team discuss and refine meeting outcomes.')
  lines.push(
    'You have full access to the company\'s brand, product, goals, personas, and competitive intelligence ' +
    'so that everything you produce is grounded in company context, not generic advice.',
  )
  lines.push('Answer questions using the meeting context below. When asked to draft a document, produce clear markdown.')
  lines.push('If something is not in the meeting notes or company context, say so rather than inventing facts.')
  lines.push('')

  // --- Brand ------------------------------------------------------------------
  if (brand && brand.mission && brand.company_name) {
    lines.push('## Brand')
    lines.push(`Company: ${brand.company_name}`)
    lines.push(`Mission: ${brand.mission}`)
    lines.push(`Vision: ${brand.vision}`)
    lines.push(`North star: ${brand.north_star}`)
    lines.push(`Voice: ${brand.voice}`)
    lines.push(`Tone: ${brand.tone}`)
    lines.push(`Pillars: ${brand.pillars}`)
    lines.push(`Audience: ${brand.target_audience}`)
    if (brand.values) lines.push(`Values: ${brand.values}`)
    if (brand.guardrails) {
      lines.push('')
      lines.push('### Guardrails — never violate')
      lines.push(brand.guardrails)
    }
    lines.push('')
  }

  // --- Terminology ------------------------------------------------------------
  if (terminologyText?.trim()) {
    lines.push('## Terminology')
    lines.push(terminologyText.trim())
    lines.push('')
  }

  // --- Narratives -------------------------------------------------------------
  if (narrativesText?.trim()) {
    lines.push('## Brand narratives')
    lines.push(narrativesText.trim())
    lines.push('')
  }

  // --- Business plan ----------------------------------------------------------
  if (businessPlanText?.trim()) {
    lines.push('## Business plan')
    lines.push(businessPlanText.trim())
    lines.push('')
  }

  // --- Current goals ----------------------------------------------------------
  if (goalsText?.trim()) {
    lines.push('## Current goals')
    lines.push(goalsText.trim())
    lines.push('')
  }

  // --- Product ----------------------------------------------------------------
  if (productText?.trim() || featuresText?.trim()) {
    lines.push('## Product')
    if (productText?.trim()) lines.push(productText.trim())
    if (featuresText?.trim()) {
      lines.push('Features:')
      lines.push(featuresText.trim())
    }
    lines.push('')
  }

  // --- Personas ---------------------------------------------------------------
  if (personasText?.trim()) {
    lines.push('## Personas')
    lines.push(personasText.trim())
    lines.push('')
  }

  // --- Competitors ------------------------------------------------------------
  if (competitorsText?.trim()) {
    lines.push('## Competitive landscape')
    lines.push(competitorsText.trim())
    lines.push('')
  }

  // --- Meeting ----------------------------------------------------------------
  lines.push('## Meeting')
  lines.push(`Title: ${meeting.title}`)
  if (meeting.meetingDate) lines.push(`Date: ${meeting.meetingDate}`)
  lines.push('')
  if (meeting.summary) {
    lines.push('### Summary')
    lines.push(meeting.summary)
    lines.push('')
  }
  lines.push('### Decisions')
  lines.push(meeting.decisionsJson || '[]')
  lines.push('')
  lines.push('### Action items')
  lines.push(meeting.actionItemsJson || '[]')
  lines.push('')
  lines.push('### Open questions')
  lines.push(meeting.openQuestionsJson || '[]')
  lines.push('')
  lines.push('### Transcript (may be truncated for context limits)')
  lines.push(meeting.transcriptExcerpt)

  return lines.join('\n')
}

// ─────────────────────────────────────────────────────────────────────────────
// Discovery Entry Analysis
// ─────────────────────────────────────────────────────────────────────────────

export function buildDiscoveryEntryAnalysisPrompt(params: {
  rawContent: string
  entryType: string
  availableTags: string[]
}): string {
  const { rawContent, entryType, availableTags } = params
  const typeLabel =
    entryType === 'interview' ? 'customer interview transcript'
    : entryType === 'review'  ? 'customer review'
    : entryType === 'survey'  ? 'survey response'
    : entryType === 'email'   ? 'customer email'
    : 'customer observation'

  const lines: string[] = []

  lines.push('You are a world-class customer discovery expert trained in Jobs to be Done theory, qualitative research synthesis, and commercial signal detection.')
  lines.push('')
  lines.push(`Analyse the following ${typeLabel}. Extract structured insight WITHOUT interpreting beyond what is stated.`)
  lines.push('Do not add assumptions. Do not filter for what sounds positive. Report what is actually present in the data.')
  lines.push('')
  lines.push(`[${typeLabel.toUpperCase()}]`)
  lines.push(rawContent.slice(0, 30000))
  lines.push('')

  if (availableTags.length > 0) {
    lines.push('AVAILABLE TAGS — only pick from this list. Return [] if none genuinely apply:')
    lines.push(availableTags.join(', '))
    lines.push('')
  }

  lines.push('Return a JSON object with EXACTLY these fields:')
  lines.push('')
  lines.push('  sentiment         — "positive" | "neutral" | "negative" | "mixed"')
  lines.push('                      mixed = genuine positives AND negatives both present.')
  lines.push('')
  lines.push('  tags              — array of strings from available tags that genuinely apply. [] if none.')
  lines.push('')
  lines.push('  key_quote_1       — Single most revealing verbatim line from the content. Exact words only, no paraphrase.')
  lines.push('  key_quote_2       — Second most revealing verbatim line. null if fewer than 2 standouts exist.')
  lines.push('  key_quote_3       — Third most revealing verbatim line. null if fewer than 3.')
  lines.push('')
  lines.push('  jtbd              — The underlying job-to-be-done in "Help me ___ so I can ___" format.')
  lines.push('                      This is what the person is ACTUALLY trying to accomplish, not what they said literally.')
  lines.push('                      null if this content type does not support JTBD extraction.')
  lines.push('')
  lines.push('  wtp_signal        — "strong" | "moderate" | "weak" | "none"')
  lines.push('                      strong   = unprompted price mention or explicit willingness to pay stated.')
  lines.push('                      moderate = discussed value, budget, or comparison with paid alternatives.')
  lines.push('                      weak     = vague positive signal with no pricing language.')
  lines.push('                      none     = no commercial signal.')
  lines.push('')
  lines.push('  wtp_price_points  — array of numbers for any specific prices mentioned (e.g. [29, 49]). [] if none.')
  lines.push('')
  lines.push('  problem_severity  — integer 1–5. How acutely does this person feel the problem?')
  lines.push('                      5 = actively painful, causing them to seek a solution now.')
  lines.push('                      1 = mild awareness, not a priority.')
  lines.push('                      null if cannot be assessed from this content.')
  lines.push('')
  lines.push('  adoption_willingness — integer 1–5. How willing do they seem to adopt a solution?')
  lines.push('                      5 = eager, already taking action or asking how to sign up.')
  lines.push('                      1 = resistant or indifferent.')
  lines.push('                      null if cannot be assessed.')
  lines.push('')
  lines.push('Output ONLY valid JSON. No preamble, no markdown fences, no explanation.')

  return lines.join('\n')
}
