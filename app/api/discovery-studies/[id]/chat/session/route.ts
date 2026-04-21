import { createClient } from '@/lib/supabase/server'
import { getOrganizationForUser } from '@/lib/queries/organizations'
import { createChatSession, getChatMessages } from '@/lib/queries/chat'
import { linkStudyChatSession } from '@/lib/queries/discovery-studies'
import { DEFAULT_MODEL } from '@/lib/ai/models'
import { createUntypedServiceClient } from '@/lib/supabase/service'

/**
 * GET /api/discovery-studies/[id]/chat/session
 * Returns (or creates) the persistent chat session for a study plus full message history.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: studyId } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

    const org = await getOrganizationForUser(user.id)
    if (!org) return Response.json({ error: 'Not found' }, { status: 404 })

    const db = createUntypedServiceClient()

    // Load study
    const { data: studyData, error: studyError } = await db
      .from('discovery_studies')
      .select('id, name, chat_session_id, organization_id')
      .eq('id', studyId)
      .eq('organization_id', org.id)
      .is('deleted_at', null)
      .single()

    if (studyError || !studyData) {
      return Response.json({ error: 'Not found' }, { status: 404 })
    }

    const study = studyData as { id: string; name: string; chat_session_id: string | null; organization_id: string }

    // If a session already exists, return it with its messages
    if (study.chat_session_id) {
      const messages = await getChatMessages(study.chat_session_id)
      return Response.json({
        data: {
          session_id: study.chat_session_id,
          messages,
          is_new: false,
        },
      })
    }

    // Create a new persistent session for this study
    const { session, error: createError } = await createChatSession(
      org.id,
      user.id,
      {
        brand: false,
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
        customer_insights: false,
        customer_hub_contact_id: null,
        customer_hub_segment: null,
        discovery_study_id: studyId,
      },
      DEFAULT_MODEL.id,
      null,
      `Study chat: ${study.name}`,
    )

    if (createError || !session) {
      return Response.json({ error: 'Failed to create chat session' }, { status: 500 })
    }

    // Link the session to the study
    const { error: linkError } = await linkStudyChatSession(studyId, org.id, session.id)
    if (linkError) {
      return Response.json({ error: 'Failed to link session' }, { status: 500 })
    }

    return Response.json({
      data: {
        session_id: session.id,
        messages: [],
        is_new: true,
      },
    })
  } catch (err) {
    console.error('[study/chat/session] unexpected', err)
    return Response.json({ error: 'Internal error' }, { status: 500 })
  }
}
