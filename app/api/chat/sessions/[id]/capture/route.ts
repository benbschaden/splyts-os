import { z } from 'zod'
import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@/lib/supabase/server'
import { getOrganizationForUser } from '@/lib/queries/organizations'
import { getChatSessionById, getChatMessages } from '@/lib/queries/chat'
import { getBrandContext } from '@/lib/queries/brand-context'
import { createDocument } from '@/lib/queries/documents'
import { buildDocumentCapturePrompt } from '@/lib/ai/prompts'
import { DEFAULT_MODEL } from '@/lib/ai/models'

const schema = z.object({
  document_type: z.string().min(1).max(100),
  title: z.string().min(1).max(255),
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

    const session = await getChatSessionById(id, user.id)
    if (!session || session.organization_id !== org.id) {
      return Response.json({ error: 'Not found' }, { status: 404 })
    }

    const body = await request.json()
    const parsed = schema.safeParse(body)
    if (!parsed.success) {
      return Response.json({ error: parsed.error.errors[0].message }, { status: 400 })
    }

    const { document_type, title } = parsed.data

    const [messages, brand] = await Promise.all([
      getChatMessages(id),
      getBrandContext(org.id),
    ])

    if (messages.length === 0) {
      return Response.json({ error: 'No messages to capture' }, { status: 422 })
    }

    // Format conversation as text for the prompt
    const conversationText = messages
      .map((m) => `${m.role === 'user' ? 'You' : 'AI'}: ${m.content}`)
      .join('\n\n')

    const prompt = buildDocumentCapturePrompt({
      conversationText,
      documentType: document_type,
      brand,
    })

    const apiKey = process.env.ANTHROPIC_API_KEY
    if (!apiKey) {
      return Response.json({ error: 'AI is not configured' }, { status: 503 })
    }

    const anthropic = new Anthropic({ apiKey })
    let documentContent: string

    try {
      const response = await anthropic.messages.create({
        model: DEFAULT_MODEL.id,
        max_tokens: 4096,
        messages: [{ role: 'user', content: prompt }],
      })
      const textBlock = response.content.find((b) => b.type === 'text')
      if (!textBlock || textBlock.type !== 'text') {
        return Response.json({ error: 'Document generation failed. Please try again.' }, { status: 500 })
      }
      documentContent = textBlock.text.trim()
    } catch {
      return Response.json({ error: 'Document generation failed. Please try again.' }, { status: 500 })
    }

    const { document, error } = await createDocument({
      organizationId: org.id,
      userId: user.id,
      title,
      content: documentContent,
      docType: document_type,
      sourceSessionId: id,
    })

    if (error || !document) {
      return Response.json({ error: 'Document generated but failed to save' }, { status: 500 })
    }

    return Response.json({ document }, { status: 201 })
  } catch {
    return Response.json({ error: 'Internal error' }, { status: 500 })
  }
}
