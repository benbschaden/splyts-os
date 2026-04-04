import Link from 'next/link'

const sections = [
  {
    label: 'Strategy',
    description: 'Core documents that feed into AI context, the business plan, and planning.',
    items: [
      { href: '/dashboard/company/business-plan', name: 'Business plan', desc: '8-section plan with PDF export — KPIs, risks, and roadmap pulled live from Performance' },
      { href: '/dashboard/company/knowledge', name: 'Company knowledge', desc: 'Uploaded documents and files the AI can reference' },
    ],
  },
  {
    label: 'Product',
    description: 'Product knowledge injected into generation prompts and the AI assistant.',
    items: [
      { href: '/dashboard/company/product', name: 'Product context', desc: 'Overview, positioning, differentiators and pricing — always in AI context' },
      { href: '/dashboard/company/features', name: 'Features', desc: 'Feature catalogue with AI visibility toggle per feature' },
    ],
  },
  {
    label: 'Brand',
    description: 'Voice, messaging, visual identity, and audience profiles used in every generation.',
    items: [
      { href: '/dashboard/company/brand', name: 'Brand context', desc: 'Mission, voice, audience, pillars, and guardrails' },
      { href: '/dashboard/company/narratives', name: 'Brand narratives', desc: 'The 3–5 core stories your company tells, anchoring AI content' },
      { href: '/dashboard/company/terminology', name: 'Terminology', desc: 'Always-use and never-use word list for AI consistency' },
      { href: '/dashboard/company/personas', name: 'Personas', desc: 'Target audience profiles fed into AI generation' },
      { href: '/dashboard/settings/profile', name: 'Your voice', desc: 'Set up your personal content voice in your profile' },
      { href: '/dashboard/company/assets', name: 'Brand assets', desc: 'Logos, colours, typography, and image style reference' },
    ],
  },
  {
    label: 'Content system',
    description: 'Templates, proof, and performance targets for all content formats.',
    items: [
      { href: '/dashboard/company/content-types', name: 'Content types', desc: 'Templates and rules per format — platform, cadence, and custom guidelines' },
      { href: '/dashboard/company/social-proof', name: 'Social proof', desc: 'Testimonials, case studies, and metrics to strengthen AI content' },
      { href: '/dashboard/company/benchmarks', name: 'Content benchmarks', desc: 'Industry-standard performance targets per platform, customisable' },
    ],
  },
]

export function CompanyOverview() {
  return (
    <div className="max-w-xl space-y-10">
      <div className="space-y-2">
        <h2 className="text-sm font-semibold text-foreground">Company brain</h2>
        <p className="text-sm text-muted-foreground leading-relaxed">
          The stable knowledge your OS holds — brand, product, and content systems. Set it up once
          and it makes every AI output more consistent.
          {' '}
          <Link href="/dashboard/performance" className="font-medium text-foreground underline-offset-4 hover:underline">
            Live performance →
          </Link>
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
