export interface BusinessPlanSection {
  key: string
  label: string
  description: string
  placeholder: string
  aiVisibleByDefault: boolean
}

export const BUSINESS_PLAN_SECTIONS: BusinessPlanSection[] = [
  {
    key: 'executive_summary',
    label: 'Executive summary',
    description: 'A concise overview of the entire plan — the company, opportunity, strategy, and financial outlook in one page.',
    placeholder: 'Summarise your business, what it does, and why it will succeed…',
    aiVisibleByDefault: true,
  },
  {
    key: 'problem',
    label: 'Problem',
    description: 'The specific pain point or gap in the market your company addresses.',
    placeholder: 'What problem exists today and who experiences it?',
    aiVisibleByDefault: true,
  },
  {
    key: 'solution',
    label: 'Solution',
    description: 'How your product or service solves the problem, and what makes the approach compelling.',
    placeholder: 'Describe your solution and why customers will choose it…',
    aiVisibleByDefault: true,
  },
  {
    key: 'market_opportunity',
    label: 'Market opportunity',
    description: 'The size and characteristics of the target market — TAM, SAM, SOM — and why now is the right time.',
    placeholder: 'Describe the market size, trends, and timing…',
    aiVisibleByDefault: true,
  },
  {
    key: 'business_model',
    label: 'Business model',
    description: 'How the company makes money — revenue streams, pricing strategy, unit economics.',
    placeholder: 'How do you generate revenue? What does the pricing look like?',
    aiVisibleByDefault: false,
  },
  {
    key: 'competitive_landscape',
    label: 'Competitive landscape',
    description: 'Key competitors, your differentiation, and sustainable advantages.',
    placeholder: 'Who else operates in this space and what sets you apart?',
    aiVisibleByDefault: false,
  },
  {
    key: 'go_to_market',
    label: 'Go-to-market strategy',
    description: 'How you acquire, convert, and retain customers — channels, partnerships, and launch plan.',
    placeholder: 'Describe your acquisition channels and growth strategy…',
    aiVisibleByDefault: true,
  },
  {
    key: 'team',
    label: 'Team',
    description: 'Founders, key hires, and advisors — why this team is uniquely positioned to execute.',
    placeholder: 'Who is on the team and what relevant experience do they bring?',
    aiVisibleByDefault: true,
  },
  {
    key: 'financials',
    label: 'Financial plan',
    description: 'Revenue projections, key cost drivers, runway, and funding requirements.',
    placeholder: 'Outline revenue forecasts, burn rate, and funding needs…',
    aiVisibleByDefault: false,
  },
  {
    key: 'metrics',
    label: 'Key metrics',
    description: 'The numbers that matter most — KPIs the business tracks to measure progress.',
    placeholder: 'What metrics do you track? (e.g. MRR, churn, CAC, LTV…)',
    aiVisibleByDefault: false,
  },
  {
    key: 'risks',
    label: 'Risks and mitigations',
    description: 'Honest assessment of the biggest risks and what you are doing to reduce them.',
    placeholder: 'What could go wrong and how are you managing those risks?',
    aiVisibleByDefault: false,
  },
]

export type BusinessPlanSections = Record<string, string>

/** The reserved key used inside the sections JSONB to store AI visibility overrides. */
export const AI_CONTEXT_KEYS_FIELD = '__ai_context_keys'

/** Returns the set of section keys that should be included in AI prompts. */
export function getAiVisibleKeys(sections: BusinessPlanSections): Set<string> {
  const stored = sections[AI_CONTEXT_KEYS_FIELD]
  if (stored) {
    try {
      const parsed = JSON.parse(stored)
      if (Array.isArray(parsed)) return new Set(parsed as string[])
    } catch { /* fall through to defaults */ }
  }
  return new Set(
    BUSINESS_PLAN_SECTIONS.filter((s) => s.aiVisibleByDefault).map((s) => s.key),
  )
}
