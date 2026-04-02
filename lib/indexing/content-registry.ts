type ContentTypeConfig = {
  deriveText: (row: Record<string, unknown>) => { title: string; summary: string }
  deriveMetadata?: (row: Record<string, unknown>) => Record<string, unknown>
}

function str(value: unknown): string {
  if (typeof value === 'string') return value
  if (value == null) return ''
  return String(value)
}

function truncate(text: string, maxLength: number): string {
  const cleaned = text.replace(/[#*_`>\[\]]/g, '').replace(/\s+/g, ' ').trim()
  return cleaned.slice(0, maxLength)
}

function flattenJsonbSections(sections: unknown): string {
  if (!sections || typeof sections !== 'object') return ''
  if (Array.isArray(sections)) {
    return sections
      .map((s) => `${str((s as Record<string, unknown>).title)}: ${str((s as Record<string, unknown>).content)}`)
      .join('. ')
  }
  return Object.entries(sections as Record<string, unknown>)
    .map(([key, val]) => `${key}: ${str(val)}`)
    .join('. ')
}

export const CONTENT_REGISTRY: Record<string, ContentTypeConfig> = {
  output: {
    deriveText: (row) => ({
      title: str(row.title),
      summary: truncate(`${str(row.brief)} ${str(row.content)}`, 500),
    }),
    deriveMetadata: (row) => ({
      project_id: row.project_id ?? null,
      status: row.status ?? null,
      content_type_id: row.content_type_id ?? null,
    }),
  },

  document: {
    deriveText: (row) => ({
      title: str(row.title),
      summary: truncate(str(row.summary || row.content), 500),
    }),
    deriveMetadata: (row) => ({
      visibility: row.visibility ?? null,
      doc_type: row.doc_type ?? null,
    }),
  },

  discussion: {
    deriveText: (row) => ({
      title: str(row.title),
      summary: truncate(str(row.ai_summary || row.title), 500),
    }),
    deriveMetadata: (row) => ({
      project_id: row.project_id ?? null,
      status: row.status ?? null,
    }),
  },

  business_plan: {
    deriveText: (row) => ({
      title: str(row.name || 'Business Plan'),
      summary: truncate(flattenJsonbSections(row.sections), 500),
    }),
  },

  discovery_study: {
    deriveText: (row) => ({
      title: str(row.name || row.goal || ''),
      summary: truncate(`${str(row.goal)} ${str(row.script_markdown)} ${str(row.analysis_markdown)}`, 500),
    }),
    deriveMetadata: (row) => ({
      project_id: row.project_id ?? null,
      status: row.status ?? null,
    }),
  },

  discovery_entry: {
    deriveText: (row) => ({
      title: str(row.source || row.entry_type || ''),
      summary: truncate(str(row.raw_content), 500),
    }),
    deriveMetadata: (row) => ({
      project_id: row.project_id ?? null,
      entry_type: row.entry_type ?? null,
      sentiment: row.sentiment ?? null,
    }),
  },

  customer_insight: {
    deriveText: (row) => ({
      title: str(row.title || row.category || ''),
      summary: truncate(str(row.content), 500),
    }),
    deriveMetadata: (row) => ({
      category: row.category ?? null,
      impact: row.impact ?? null,
      status: row.status ?? null,
    }),
  },

  persona: {
    deriveText: (row) => ({
      title: str(row.name),
      summary: truncate(
        `${str(row.role)} ${str(row.goals)} ${str(row.frustrations)} ${str(row.behaviors)}`,
        500,
      ),
    }),
  },

  project: {
    deriveText: (row) => ({
      title: str(row.name),
      summary: truncate(str(row.description), 500),
    }),
    deriveMetadata: (row) => ({
      status: row.status ?? null,
      category: row.category ?? null,
    }),
  },

  contact: {
    deriveText: (row) => ({
      title: [str(row.name), str(row.company)].filter(Boolean).join(' — '),
      summary: truncate(
        `${str(row.segment)} ${str(row.notes)} ${str(row.title)}`,
        500,
      ),
    }),
    deriveMetadata: (row) => ({
      segment: row.segment ?? null,
      health_score: row.health_score ?? null,
    }),
  },

  contact_communication: {
    deriveText: (row) => ({
      title: str(row.subject || ''),
      summary: truncate(str(row.content), 500),
    }),
    deriveMetadata: (row) => ({
      contact_id: row.contact_id ?? null,
      channel: row.channel ?? null,
      direction: row.direction ?? null,
      sentiment: row.sentiment ?? null,
    }),
  },

  company_milestone: {
    deriveText: (row) => ({
      title: str(row.title),
      summary: truncate(`${str(row.date)} ${str(row.description)} ${str(row.completion_notes)}`, 500),
    }),
    deriveMetadata: (row) => ({
      category: row.category ?? null,
      status: row.status ?? null,
    }),
  },

  product_roadmap_item: {
    deriveText: (row) => ({
      title: str(row.title),
      summary: truncate(`${str(row.phase)} ${str(row.description)}`, 500),
    }),
    deriveMetadata: (row) => ({
      phase: row.phase ?? null,
    }),
  },

  product_feature: {
    deriveText: (row) => ({
      title: str(row.name),
      summary: truncate(`${str(row.tagline)} ${str(row.description)}`, 500),
    }),
    deriveMetadata: (row) => ({
      status: row.status ?? null,
      category: row.category ?? null,
    }),
  },

  period_goal: {
    deriveText: (row) => ({
      title: str(row.title),
      summary: truncate(`${str(row.description)} ${str(row.outcome_notes)}`, 500),
    }),
    deriveMetadata: (row) => ({
      goal_period_id: row.goal_period_id ?? null,
      status: row.status ?? null,
    }),
  },

  goal_period: {
    deriveText: (row) => ({
      title: str(row.name),
      summary: truncate(
        `${str(row.focus_areas)} ${str(row.what_to_push)} ${str(row.what_to_defer)} ${str(row.review_summary)}`,
        500,
      ),
    }),
    deriveMetadata: (row) => ({
      status: row.status ?? null,
    }),
  },

  terminology: {
    deriveText: (row) => ({
      title: str(row.preferred),
      summary: truncate(`Prefer "${str(row.preferred)}" avoid "${str(row.avoid)}". ${str(row.context)}`, 500),
    }),
  },

  brand_narrative: {
    deriveText: (row) => ({
      title: str(row.name),
      summary: truncate(`${str(row.narrative)} ${str(row.usage_context)}`, 500),
    }),
  },

  social_proof: {
    deriveText: (row) => ({
      title: str(row.attribution || row.source || ''),
      summary: truncate(str(row.quote), 500),
    }),
    deriveMetadata: (row) => ({
      proof_type: row.proof_type ?? null,
    }),
  },

  competitor: {
    deriveText: (row) => ({
      title: str(row.name),
      summary: truncate(
        `${str(row.positioning)} Strengths: ${str(row.strengths)} Weaknesses: ${str(row.weaknesses)}`,
        500,
      ),
    }),
  },

  content_calendar: {
    deriveText: (row) => ({
      title: str(row.title),
      summary: truncate(`${str(row.scheduled_date)} ${str(row.description)} ${str(row.notes)}`, 500),
    }),
    deriveMetadata: (row) => ({
      status: row.status ?? null,
      platform: row.platform ?? null,
    }),
  },

  platform_guideline: {
    deriveText: (row) => ({
      title: str(row.platform),
      summary: truncate(`${str(row.guidelines)} ${str(row.format_notes)}`, 500),
    }),
  },

  risk: {
    deriveText: (row) => ({
      title: str(row.title),
      summary: truncate(`${str(row.description)} Mitigation: ${str(row.mitigation)}`, 500),
    }),
    deriveMetadata: (row) => ({
      severity: row.severity ?? null,
      likelihood: row.likelihood ?? null,
      status: row.status ?? null,
    }),
  },

  project_material: {
    deriveText: (row) => ({
      title: str(row.title),
      summary: truncate(str(row.content), 500),
    }),
    deriveMetadata: (row) => ({
      project_id: row.project_id ?? null,
      material_type: row.material_type ?? null,
    }),
  },

  content_idea: {
    deriveText: (row) => ({
      title: str(row.title),
      summary: truncate(str(row.description), 500),
    }),
    deriveMetadata: (row) => ({
      status: row.status ?? null,
    }),
  },

  company_knowledge_file: {
    deriveText: (row) => ({
      title: str(row.filename || row.original_filename || ''),
      summary: truncate(str(row.processed_text), 500),
    }),
    deriveMetadata: (row) => ({
      status: row.status ?? null,
      file_type: row.file_type ?? null,
    }),
  },

  product_context: {
    deriveText: (row) => ({
      title: 'Product Context',
      summary: truncate(flattenJsonbSections(row.sections), 500),
    }),
  },
}

export function getRegisteredContentTypes(): string[] {
  return Object.keys(CONTENT_REGISTRY)
}
