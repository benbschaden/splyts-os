import { createClient } from '@/lib/supabase/server'
import { createUntypedServiceClient } from '@/lib/supabase/service'
import { getOrganizationForUser } from '@/lib/queries/organizations'
import {
  findChatSessionForContact,
  createChatSession,
  getChatMessages,
} from '@/lib/queries/chat'
import { DEFAULT_MODEL } from '@/lib/ai/models'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: contactId } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

    const org = await getOrganizationForUser(user.id)
    if (!org) return Response.json({ error: 'Not found' }, { status: 404 })

    const session = await findChatSessionForContact(contactId, user.id)
    if (!session) return Response.json({ session: null, messages: [] })

    const messages = await getChatMessages(session.id)
    return Response.json({ session, messages })
  } catch {
    return Response.json({ error: 'Internal error' }, { status: 500 })
  }
}

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: contactId } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

    const org = await getOrganizationForUser(user.id)
    if (!org) return Response.json({ error: 'Not found' }, { status: 404 })

    // Verify contact belongs to this org
    const db = createUntypedServiceClient()
    const { data: contact } = await db
      .from('contacts')
      .select('id, name')
      .eq('id', contactId)
      .eq('organization_id', org.id)
      .is('deleted_at', null)
      .maybeSingle()

    if (!contact) return Response.json({ error: 'Not found' }, { status: 404 })

    // Return existing session if one exists
    const existing = await findChatSessionForContact(contactId, user.id)
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
        customer_hub_contact_id: contactId,
        customer_hub_segment: null,
      },
      DEFAULT_MODEL.id,
      null,
      `${(contact as { name: string }).name} · Analysis`,
    )

    if (error || !session) return Response.json({ error: 'Failed to create session' }, { status: 500 })

    return Response.json({ session, messages: [] }, { status: 201 })
  } catch {
    return Response.json({ error: 'Internal error' }, { status: 500 })
  }
}
