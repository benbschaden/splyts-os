import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { getOrganizationForUser } from '@/lib/queries/organizations'
import { getChatSessions, createChatSession } from '@/lib/queries/chat'
import { DEFAULT_MODEL, getModelById } from '@/lib/ai/models'

const createSchema = z.object({
  model_id: z.string().optional(),
  context_config: z.object({
    brand: z.boolean(),
    business_plan: z.boolean(),
    personas: z.boolean(),
    browser: z.boolean(),
    product: z.boolean(),
    product_roadmap: z.boolean(),
    company_milestones: z.boolean(),
    current_goals: z.boolean(),
    filed_documents: z.boolean(),
    competitors: z.boolean(),
    social_proof: z.boolean(),
    kpis: z.boolean(),
  }).optional().default({
    brand: true,
    business_plan: false,
    personas: false,
    browser: false,
    product: false,
    product_roadmap: false,
    company_milestones: false,
    current_goals: false,
    filed_documents: false,
    competitors: false,
    social_proof: false,
    kpis: false,
  }),
})

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

    const org = await getOrganizationForUser(user.id)
    if (!org) return Response.json({ error: 'Not found' }, { status: 404 })

    const sessions = await getChatSessions(org.id, user.id)
    return Response.json({ sessions })
  } catch {
    return Response.json({ error: 'Internal error' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

    const org = await getOrganizationForUser(user.id)
    if (!org) return Response.json({ error: 'Not found' }, { status: 404 })

    const body = await request.json()
    const parsed = createSchema.safeParse(body)
    if (!parsed.success) {
      return Response.json({ error: 'Invalid input' }, { status: 400 })
    }

    const modelId = (parsed.data.model_id ? getModelById(parsed.data.model_id) : null)?.id ?? DEFAULT_MODEL.id
    const { session, error } = await createChatSession(org.id, user.id, parsed.data.context_config, modelId)
    if (error || !session) {
      return Response.json({ error: 'Failed to create chat session' }, { status: 500 })
    }

    return Response.json({ session }, { status: 201 })
  } catch {
    return Response.json({ error: 'Internal error' }, { status: 500 })
  }
}
