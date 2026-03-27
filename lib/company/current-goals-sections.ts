export interface GoalsSection {
  key: string
  label: string
  description: string
  placeholder: string
}

export const CURRENT_GOALS_SECTIONS: GoalsSection[] = [
  {
    key: 'period_label',
    label: 'Period',
    description: 'The time period these goals cover — e.g. Q2 2026, H1 2026, Spring Sprint.',
    placeholder: 'e.g. Q2 2026 (April–June)',
  },
  {
    key: 'focus_areas',
    label: 'Focus areas',
    description: 'The 2–4 areas the company is prioritising this period. Everything else is secondary.',
    placeholder: 'List the key focus areas for this quarter…',
  },
  {
    key: 'key_results',
    label: 'Key results',
    description: 'The specific, measurable outcomes that would make this quarter a success.',
    placeholder: 'e.g. Reach 500 MRR, ship feature X, hire 2 engineers…',
  },
  {
    key: 'what_to_push',
    label: 'What to push',
    description: 'Topics, narratives, or initiatives to amplify in communications and content this period.',
    placeholder: 'What themes should dominate our content and outreach this quarter?',
  },
  {
    key: 'what_to_defer',
    label: 'What to defer',
    description: 'Things that are important but deliberately not the focus this period.',
    placeholder: 'What are we saying no to or parking until next quarter?',
  },
]

export type CurrentGoalsSections = Record<string, string>
