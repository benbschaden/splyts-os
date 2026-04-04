import { z } from 'zod'
import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@/lib/supabase/server'
import { getOrganizationForUser } from '@/lib/queries/organizations'
import { getPlaybookById, canEditPlaybook } from '@/lib/queries/playbooks'
import { getBrandContext } from '@/lib/queries/brand-context'
import { getTerminology } from '@/lib/queries/terminology'
import { getAiVisibleNarratives } from '@/lib/queries/brand-narratives'
import { buildPlaybookCompanyContextBlock, buildPlaybookPolishPrompt } from '@/lib/ai/prompts'
import { DEFAULT_MODEL, getModelById } from '@/lib/ai/models'

const polishSchema = z.object({
  content: z.string().min(1).max(50000),
  instruction: z.string().max(5000).optional(),
  modelId: z.string().optional(),
})

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

    const org = await getOrganizationForUser(user.id)
    if (!org) return Response.json({ error: 'Not found' }, { status: 404 })

    const playbook = await getPlaybookById(id, org.id)
    if (!playbook) return Response.json({ error: 'Not found' }, { status: 404 })

    if (!canEditPlaybook(user.id, org.role, playbook)) {
      return Response.json({ error: 'Not found' }, { status: 404 })
    }

    const body = await request.json()
    const parsed = polishSchema.safeParse(body)
    if (!parsed.success) {
      return Response.json({ error: 'Invalid input' }, { status: 400 })
    }

    const apiKey = process.env.ANTHROPIC_API_KEY
    if (!apiKey) {
      return Response.json({ error: 'AI not configured' }, { status: 503 })
    }

    const [brandContext, terminology, narratives] = await Promise.all([
      getBrandContext(org.id),
      getTerminology(org.id),
      getAiVisibleNarratives(org.id),
    ])

    const companyContextBlock = buildPlaybookCompanyContextBlock({
      brand: brandContext,
      terminology,
      narratives,
    })
    const brandVoice = brandContext?.voice ?? null

    const model = (parsed.data.modelId ? getModelById(parsed.data.modelId) : null) ?? DEFAULT_MODEL

    const prompt = buildPlaybookPolishPrompt({
      title: playbook.title,
      category: playbook.category,
      content: parsed.data.content,
      brandVoice,
      instruction: parsed.data.instruction,
      companyContextBlock: companyContextBlock || null,
    })

    const anthropic = new Anthropic({ apiKey })
    const response = await anthropic.messages.create({
      model: model.id,
      max_tokens: 4096,
      messages: [{ role: 'user', content: prompt }],
    })

    const textBlock = response.content.find((b) => b.type === 'text')
    if (!textBlock || textBlock.type !== 'text') {
      return Response.json({ error: 'AI returned no content' }, { status: 502 })
    }

    return Response.json({ polished: textBlock.text.trim() })
  } catch (err) {
    console.error('[playbooks/polish] Error:', err)
    return Response.json({ error: 'Internal error' }, { status: 500 })
  }
}
