export interface ProductSection {
  key: string
  label: string
  description: string
  placeholder: string
  aiVisibleByDefault: boolean
}

export const PRODUCT_SECTIONS: ProductSection[] = [
  {
    key: 'product_overview',
    label: 'Product overview',
    description: 'What the product is, who it serves, and the core value it delivers.',
    placeholder: 'Describe the product in plain terms — what it does and why it exists…',
    aiVisibleByDefault: true,
  },
  {
    key: 'key_user_flows',
    label: 'Key user flows',
    description: 'The primary journeys a user takes through the product — from onboarding to core actions.',
    placeholder: 'Walk through the main flows: sign up, core loop, key actions a user takes…',
    aiVisibleByDefault: true,
  },
  {
    key: 'surfaces',
    label: 'Surfaces and platforms',
    description: 'Every place the product exists — apps, dashboards, APIs, hardware, etc.',
    placeholder: 'e.g. iOS app, Apple Watch app, Vercel dashboard, REST API, Supabase backend…',
    aiVisibleByDefault: true,
  },
  {
    key: 'backend_services',
    label: 'Backend services and infrastructure',
    description: 'The technical stack, services, and systems that power the product.',
    placeholder: 'e.g. Supabase (Postgres, Auth, Storage), Redis, Python workers, Vercel, Anthropic API…',
    aiVisibleByDefault: false,
  },
  {
    key: 'methodology',
    label: 'Methodology and approach',
    description: 'The principles, algorithms, or frameworks that define how the product works — what makes it distinct.',
    placeholder: 'Describe the approach or methodology that sets your product apart…',
    aiVisibleByDefault: true,
  },
  {
    key: 'integrations',
    label: 'Integrations and ecosystem',
    description: 'Third-party systems, APIs, and data sources the product connects to.',
    placeholder: 'List integrations and how they fit into the product experience…',
    aiVisibleByDefault: false,
  },
  {
    key: 'pricing_and_packaging',
    label: 'Pricing and packaging',
    description: 'How the product is sold — tiers, pricing model, trial, enterprise deals.',
    placeholder: 'Describe pricing tiers, free trial, and enterprise options…',
    aiVisibleByDefault: false,
  },
  {
    key: 'positioning',
    label: 'Positioning and differentiation',
    description: 'How the product is positioned in the market — what it is, what it is not, and why it wins.',
    placeholder: 'How do you position this product vs alternatives? What is the unique angle?',
    aiVisibleByDefault: true,
  },
  {
    key: 'known_limitations',
    label: 'Known limitations',
    description: 'Current gaps, things the product does not do, or areas actively being addressed.',
    placeholder: 'What are the current limitations or gaps that the team is aware of?',
    aiVisibleByDefault: false,
  },
]

export type ProductSections = Record<string, string>
