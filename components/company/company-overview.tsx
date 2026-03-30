import Link from 'next/link'

const sections = [
  {
    label: 'Strategy',
    description: 'Core business documents that inform AI context and long-term planning.',
    items: [
      { href: '/dashboard/company/business-plan', name: 'Business plan', desc: '8-section plan with PDF export — KPIs and risks are pulled live from their dedicated tools' },
      { href: '/dashboard/company/goals', name: 'Goals', desc: 'Quarterly goals with review cycle, carry-forward, and AI injection' },
      { href: '/dashboard/company/milestones', name: 'Milestones', desc: 'Key moments in company history, included in business plan PDF' },
      { href: '/dashboard/company/competitors', name: 'Competitors', desc: 'Structured competitive intelligence — positioning, strengths, battle cards' },
      { href: '/dashboard/company/kpis', name: 'KPIs & Metrics', desc: 'Define metrics, enter weekly values — highlighted KPIs show on home dashboard' },
      { href: '/dashboard/company/risks', name: 'Risk Register', desc: 'Live risk matrix — likelihood × impact scoring, status tracking, feeds into business plan PDF' },
      { href: '/dashboard/company/funnels', name: 'Funnels', desc: 'Custom conversion funnels from your KPIs — default funnel shown on dashboard' },
    ],
  },
  {
    label: 'Product',
    description: 'Product knowledge used in generation prompts and assistant context.',
    items: [
      { href: '/dashboard/company/product', name: 'Product context', desc: 'Overview, positioning, differentiators and pricing — always in AI context' },
      { href: '/dashboard/company/features', name: 'Features', desc: 'Feature catalogue with AI visibility toggle per feature' },
      { href: '/dashboard/company/roadmap', name: 'Roadmap', desc: 'Now / Next / Later planning board — included in business plan PDF' },
    ],
  },
  {
    label: 'Branding',
    description: 'Voice, messaging, visual identity, and audience profiles used in generation.',
    items: [
      { href: '/dashboard/company/brand', name: 'Brand context', desc: 'Mission, voice, audience, pillars, and guardrails' },
      { href: '/dashboard/company/narratives', name: 'Brand narratives', desc: 'The 3-5 core stories your company tells, anchoring AI content' },
      { href: '/dashboard/company/terminology', name: 'Terminology', desc: 'Always-use and never-use word list for AI consistency' },
      { href: '/dashboard/company/personas', name: 'Personas', desc: 'Target audience profiles fed into AI generation' },
      { href: '/dashboard/company/authors', name: 'Authors', desc: 'Named voices for generation' },
      { href: '/dashboard/company/assets', name: 'Brand assets', desc: 'Logos, colors, typography, and image style reference' },
    ],
  },
  {
    label: 'Content',
    description: 'Templates, proof, and performance targets for all content types.',
    items: [
      { href: '/dashboard/company/content-types', name: 'Content types', desc: 'Templates and rules per format — includes platform, cadence, and custom guidelines' },
      { href: '/dashboard/company/social-proof', name: 'Social proof', desc: 'Testimonials, case studies, and metrics to strengthen AI content' },
      { href: '/dashboard/company/benchmarks', name: 'Content benchmarks', desc: 'Industry-standard performance targets per platform, customisable' },
    ],
  },
]

export function CompanyOverview() {
  return (
    <div className="max-w-xl space-y-10">
      <div className="space-y-2">
        <h2 className="text-sm font-semibold text-foreground">Company knowledge</h2>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Everything the operating system knows about your organisation — brand, strategy, product,
          people, and content systems. This is the foundation for consistent AI output across every project.
        </p>
      </div>

      {sections.map((section) => (
        <div key={section.label} className="space-y-3">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground/70">
            {section.label}
          </p>
          <p className="text-sm text-muted-foreground">{section.description}</p>
          <ul className="flex flex-col gap-2">
            {section.items.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className="text-sm font-medium text-foreground underline-offset-4 hover:underline"
                >
                  {item.name}
                </Link>
                <span className="text-sm text-muted-foreground"> — {item.desc}</span>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  )
}
