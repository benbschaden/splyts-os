import { z } from 'zod'
import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@/lib/supabase/server'
import { getOrganizationForUser } from '@/lib/queries/organizations'
import {
  getDiscussionById,
  getDiscussionMessages,
  createDiscussionDocumentLink,
} from '@/lib/queries/discussions'
import { createDocument } from '@/lib/queries/documents'
import { buildDiscussionDocumentPrompt } from '@/lib/ai/prompts'
import { DEFAULT_MODEL } from '@/lib/ai/models'
import { indexContent } from '@/lib/indexing/index-content'

const Schema = z.object({
  document_type: z.string().min(1).max(100),
})

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

    const org = await getOrganizationForUser(user.id)
    if (!org) return Response.json({ error: 'Not found' }, { status: 404 })

    const discussion = await getDiscussionById(id, org.id)
    if (!discussion) return Response.json({ error: 'Not found' }, { status: 404 })

    const body = await request.json()
    const parsed = Schema.safeParse(body)
    if (!parsed.success) {
      return Response.json({ error: parsed.error.errors[0].message }, { status: 400 })
    }

    const messages = await getDiscussionMessages(id, org.id)
    if (messages.length === 0) {
      return Response.json({ error: 'No messages to generate document from' }, { status: 422 })
    }

    const messageStream = messages
      .map((m) => `[${m.created_at.slice(0, 10)}] ${m.user_id}: ${m.content}`)
      .join('\n\n')

    const prompt = buildDiscussionDocumentPrompt({
      discussionTitle: discussion.title,
      documentType: parsed.data.document_type,
      messageStream,
      orgName: org.name,
    })

    const apiKey = process.env.ANTHROPIC_API_KEY
    if (!apiKey) return Response.json({ error: 'AI not configured' }, { status: 503 })

    const anthropic = new Anthropic({ apiKey, maxRetries: 4 })
    const response = await anthropic.messages.create({
      model: DEFAULT_MODEL.id,
      max_tokens: 4096,
      messages: [{ role: 'user', content: prompt }],
    })

    const textBlock = response.content.find((b) => b.type === 'text')
    if (!textBlock || textBlock.type !== 'text') {
      return Response.json({ error: 'Document generation failed' }, { status: 500 })
    }

    const content = textBlock.text.trim()
    const titleMatch = content.match(/^#\s+(.+)$/m)
    const docTitle = titleMatch ? titleMatch[1].trim() : discussion.title

    const { document, error: docError } = await createDocument({
      organizationId: org.id,
      userId: user.id,
      title: docTitle,
      content,
      docType: parsed.data.document_type,
      visibility: 'shared',
    })

    if (docError || !document) {
      return Response.json({ error: 'Failed to save document' }, { status: 500 })
    }

    await createDiscussionDocumentLink({
      discussionId: id,
      documentId: document.id,
      relationshipType: 'created_from',
    })

    indexContent('document', document, org.id).catch(err =>
      console.error('[content-index] Index failed:', err)
    )

    return Response.json({ document }, { status: 201 })
  } catch {
    return Response.json({ error: 'Internal error' }, { status: 500 })
  }
}
