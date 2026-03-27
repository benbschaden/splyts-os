export interface KpiDefault {
  name: string
  unit: 'count' | 'currency' | 'percent' | 'ratio'
  category: 'growth' | 'revenue' | 'engagement' | 'funnel' | 'custom'
  description: string
  is_highlighted: boolean
}

export const DEFAULT_KPI_DEFINITIONS: KpiDefault[] = [
  { name: 'Monthly Active Users', unit: 'count', category: 'growth', description: 'Unique users active in the last 30 days', is_highlighted: true },
  { name: 'Daily Active Users', unit: 'count', category: 'growth', description: 'Unique users active today', is_highlighted: false },
  { name: 'New Signups', unit: 'count', category: 'growth', description: 'New accounts created this period', is_highlighted: true },
  { name: 'MRR', unit: 'currency', category: 'revenue', description: 'Monthly recurring revenue', is_highlighted: true },
  { name: 'ARR', unit: 'currency', category: 'revenue', description: 'Annual recurring revenue', is_highlighted: false },
  { name: 'ARPU', unit: 'currency', category: 'revenue', description: 'Average revenue per user', is_highlighted: false },
  { name: 'Churn Rate', unit: 'percent', category: 'revenue', description: 'Percentage of customers lost per month', is_highlighted: true },
  { name: 'LTV', unit: 'currency', category: 'revenue', description: 'Lifetime value per customer', is_highlighted: false },
  { name: 'CAC', unit: 'currency', category: 'revenue', description: 'Customer acquisition cost', is_highlighted: false },
  { name: 'Trial-to-Paid', unit: 'percent', category: 'funnel', description: 'Conversion rate from trial to paid', is_highlighted: true },
  { name: 'Activation Rate', unit: 'percent', category: 'funnel', description: 'Percentage of signups who complete key action', is_highlighted: false },
  { name: 'Visitors', unit: 'count', category: 'funnel', description: 'Website visitors this period', is_highlighted: false },
  { name: 'NPS', unit: 'count', category: 'engagement', description: 'Net Promoter Score (-100 to 100)', is_highlighted: true },
  { name: 'Support Tickets', unit: 'count', category: 'engagement', description: 'Open support tickets', is_highlighted: false },
  { name: 'D7 Retention', unit: 'percent', category: 'engagement', description: 'Users returning after 7 days', is_highlighted: false },
  { name: 'D30 Retention', unit: 'percent', category: 'engagement', description: 'Users returning after 30 days', is_highlighted: false },
]

export const KPI_UNITS: Record<string, { label: string; prefix?: string; suffix?: string }> = {
  count: { label: 'Count' },
  currency: { label: 'Currency', prefix: '$' },
  percent: { label: 'Percentage', suffix: '%' },
  ratio: { label: 'Ratio', suffix: 'x' },
}

export const KPI_CATEGORIES = [
  { value: 'growth', label: 'Growth' },
  { value: 'revenue', label: 'Revenue' },
  { value: 'engagement', label: 'Engagement' },
  { value: 'funnel', label: 'Funnel' },
  { value: 'custom', label: 'Custom' },
] as const
