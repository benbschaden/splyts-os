import { createClient } from '@/lib/supabase/server'
import { getOrganizationForUser } from '@/lib/queries/organizations'
import { getBusinessPlan } from '@/lib/queries/business-plan'
import { getBrandContext } from '@/lib/queries/brand-context'
import { getProductRoadmapItems } from '@/lib/queries/product-roadmap'
import { getCompanyMilestones } from '@/lib/queries/company-milestones'
import { getCompetitors } from '@/lib/queries/competitors'
import { BUSINESS_PLAN_SECTIONS } from '@/lib/company/business-plan-sections'
import { jsPDF } from 'jspdf'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const org = await getOrganizationForUser(user.id)
  if (!org) return Response.json({ error: 'Not found' }, { status: 404 })

  const [plan, brand, roadmapItems, milestones, competitors] = await Promise.all([
    getBusinessPlan(org.id),
    getBrandContext(org.id),
    getProductRoadmapItems(org.id),
    getCompanyMilestones(org.id),
    getCompetitors(org.id),
  ])

  const sections = plan?.sections ?? {}
  const companyName = brand?.company_name ?? org.name

  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()
  const marginLeft = 25
  const marginRight = 25
  const contentWidth = pageWidth - marginLeft - marginRight
  let y = 0

  function addPageIfNeeded(needed: number): void {
    if (y + needed > pageHeight - 25) {
      doc.addPage()
      y = 30
    }
  }

  function addSection(label: string, content: string): void {
    addPageIfNeeded(30)

    doc.setFont('helvetica', 'bold')
    doc.setFontSize(14)
    doc.setTextColor(20, 20, 20)
    doc.text(label, marginLeft, y)
    y += 3

    doc.setDrawColor(220, 220, 220)
    doc.setLineWidth(0.3)
    doc.line(marginLeft, y, marginLeft + contentWidth, y)
    y += 7

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(10)
    doc.setTextColor(50, 50, 50)

    const paragraphs = content.split(/\n{2,}/)
    for (const paragraph of paragraphs) {
      const lines: string[] = doc.splitTextToSize(paragraph.replace(/\n/g, ' '), contentWidth)
      for (const line of lines) {
        addPageIfNeeded(6)
        doc.text(line, marginLeft, y)
        y += 5.2
      }
      y += 3
    }

    y += 8
  }

  // --- Cover page ---
  y = pageHeight * 0.35

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(28)
  doc.setTextColor(20, 20, 20)
  const titleLines = doc.splitTextToSize('Business Plan', contentWidth)
  doc.text(titleLines, marginLeft, y)
  y += titleLines.length * 12

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(14)
  doc.setTextColor(100, 100, 100)
  doc.text(companyName, marginLeft, y + 4)
  y += 14

  doc.setFontSize(10)
  doc.setTextColor(160, 160, 160)
  doc.text(new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }), marginLeft, y + 2)

  doc.setDrawColor(20, 20, 20)
  doc.setLineWidth(0.6)
  doc.line(marginLeft, pageHeight * 0.35 - 8, marginLeft + 40, pageHeight * 0.35 - 8)

  // --- Business plan sections ---
  doc.addPage()
  y = 30

  for (const section of BUSINESS_PLAN_SECTIONS) {
    const content = (sections[section.key] ?? '').trim()
    if (!content) continue
    addSection(section.label, content)
  }

  // --- Product roadmap section ---
  const activeRoadmapItems = roadmapItems.filter((r) => r.phase !== 'shipped')
  const shippedItems = roadmapItems.filter((r) => r.phase === 'shipped')

  if (activeRoadmapItems.length > 0 || shippedItems.length > 0) {
    const roadmapLines: string[] = []

    for (const phase of ['now', 'next', 'later'] as const) {
      const items = roadmapItems.filter((r) => r.phase === phase)
      if (items.length > 0) {
        roadmapLines.push(`${phase.charAt(0).toUpperCase() + phase.slice(1)}:`)
        items.forEach((item) => {
          roadmapLines.push(`  - ${item.title}${item.description ? `: ${item.description}` : ''}`)
        })
        roadmapLines.push('')
      }
    }

    if (shippedItems.length > 0) {
      roadmapLines.push('Shipped:')
      shippedItems.forEach((item) => {
        roadmapLines.push(`  - ${item.title}`)
      })
    }

    if (roadmapLines.length > 0) {
      addSection('Product Roadmap', roadmapLines.join('\n'))
    }
  }

  // --- Company milestones section ---
  if (milestones.length > 0) {
    const milestonesText = milestones
      .map((m) => {
        const date = new Date(m.milestone_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
        const statusLabel = m.status !== 'planned' ? ` [${m.status}]` : ''
        const desc = m.description ? `\n     ${m.description}` : ''
        return `  ${date}${statusLabel}: ${m.title}${desc}`
      })
      .join('\n\n')

    addSection('Company Milestones', milestonesText)
  }

  // --- Competitive landscape section (sourced from competitors table) ---
  const pdfCompetitors = competitors.filter((c) => c.include_in_ai)
  if (pdfCompetitors.length > 0) {
    const competitorLines: string[] = []

    for (const c of pdfCompetitors) {
      const header = c.website ? `${c.name} — ${c.website}` : c.name
      competitorLines.push(header)
      if (c.positioning) competitorLines.push(`  Positioning: ${c.positioning}`)
      if (c.strengths) competitorLines.push(`  Strengths: ${c.strengths}`)
      if (c.weaknesses) competitorLines.push(`  Weaknesses: ${c.weaknesses}`)
      if (c.pricing_notes) competitorLines.push(`  Pricing: ${c.pricing_notes}`)
      competitorLines.push('')
    }

    addSection('Competitive Landscape', competitorLines.join('\n').trimEnd())
  }

  // Footer on each page
  const totalPages = doc.getNumberOfPages()
  for (let i = 2; i <= totalPages; i++) {
    doc.setPage(i)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8)
    doc.setTextColor(180, 180, 180)
    doc.text(companyName, marginLeft, pageHeight - 12)
    doc.text(`${i - 1}`, pageWidth - marginRight, pageHeight - 12, { align: 'right' })
  }

  const buffer = Buffer.from(doc.output('arraybuffer'))

  return new Response(buffer, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${companyName.replace(/[^a-zA-Z0-9 ]/g, '')} - Business Plan.pdf"`,
    },
  })
}
