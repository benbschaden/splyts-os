import { createClient } from '@/lib/supabase/server'
import { getOrganizationForUser } from '@/lib/queries/organizations'
import {
  findChatSessionForSegment,
  createChatSession,
  getChatMessages,
} from '@/lib/queries/chat'
import { DEFAULT_MODEL } from '@/lib/ai/models'

const VALID_SEGMENTS = new Set([
  'beta_user', 'free_user', 'customer', 'power_user', 'prospect', 'churned', 'other',
])

const SEGMENT_LABELS: Record<string, string> = {
  beta_user: 'Beta Users',
  free_user: 'Free Users',
  customer: 'Paying Customers',
  power_user: 'Power Users',
  prospect: 'Prospects',
  churned: 'Churned Users',
  other: 'Other',
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ segment: string }> },
) {
  try {
    const { segment } = await params
    if (!VALID_SEGMENTS.has(segment)) return Response.json({ error: 'Invalid segment' }, { status: 400 })

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

    const org = await getOrganizationForUser(user.id)
    if (!org) return Response.json({ error: 'Not found' }, { status: 404 })

    const session = await findChatSessionForSegment(segment, user.id)
    if (!session) return Response.json({ session: null, messages: [] })

    const messages = await getChatMessages(session.id)
    return Response.json({ session, messages })
  } catch {
    return Response.json({ error: 'Internal error' }, { status: 500 })
  }
}

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ segment: string }> },
) {
  try {
    const { segment } = await params
    if (!VALID_SEGMENTS.has(segment)) return Response.json({ error: 'Invalid segment' }, { status: 400 })

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

    const org = await getOrganizationForUser(user.id)
    if (!org) return Response.json({ error: 'Not found' }, { status: 404 })

    // Return existing session if one exists
    const existing = await findChatSessionForSegment(segment, user.id)
    if (existing) {
      const messages = await getChatMessages(existing.id)
      return Response.json({ session: existing, messages }, { status: 200 })
    }

    const { session, error } = await createChatSession(
      org.id,
      user.id,
      {
        brand: true,
        business_plan: false,
        personas: false,
        product: false,
        product_roadmap: false,
        company_milestones: false,
        current_goals: false,
        filed_documents: false,
        competitors: false,
        social_proof: false,
        kpis: false,
        browser: false,
        project_materials: false,
        discovery_entries: false,
        discovery_participant: null,
        customer_insights: true,
        customer_hub_contact_id: null,
        customer_hub_segment: segment,
      },
      DEFAULT_MODEL.id,
      null,
      `${SEGMENT_LABELS[segment] ?? segment} · Analysis`,
    )

    if (error || !session) return Response.json({ error: 'Failed to create session' }, { status: 500 })

    return Response.json({ session, messages: [] }, { status: 201 })
  } catch {
    return Response.json({ error: 'Internal error' }, { status: 500 })
  }
}
