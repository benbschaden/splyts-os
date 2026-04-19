import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@/lib/supabase/server'
import { getOrganizationForUser } from '@/lib/queries/organizations'
import { getChatSessionById, getChatMessages } from '@/lib/queries/chat'
import { getBrandContext } from '@/lib/queries/brand-context'
import { getProjectById } from '@/lib/queries/projects'
import { createProjectMaterial } from '@/lib/queries/project-materials'
import { buildExtractPrompt } from '@/lib/ai/prompts'
import { DEFAULT_MODEL } from '@/lib/ai/models'

export async function POST(
  _request: Request,
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

    if (!session.project_id) {
      return Response.json({ error: 'This chat is not linked to a project' }, { status: 422 })
    }

    const [messages, brand, project] = await Promise.all([
      getChatMessages(id),
      getBrandContext(org.id),
      getProjectById(session.project_id, org.id),
    ])

    if (messages.length === 0) {
      return Response.json({ error: 'No messages to extract' }, { status: 422 })
    }

    if (!project) {
      return Response.json({ error: 'Not found' }, { status: 404 })
    }

    const conversationText = messages
      .map((m) => `${m.role === 'user' ? 'You' : 'AI'}: ${m.content}`)
      .join('\n\n')

    const prompt = buildExtractPrompt({
      conversationText,
      projectName: project.name,
      brand,
    })

    const apiKey = process.env.ANTHROPIC_API_KEY
    if (!apiKey) {
      return Response.json({ error: 'AI is not configured' }, { status: 503 })
    }

    const anthropic = new Anthropic({ apiKey, maxRetries: 4 })
    let noteContent: string

    try {
      const response = await anthropic.messages.create({
        model: DEFAULT_MODEL.id,
        max_tokens: 4096,
        messages: [{ role: 'user', content: prompt }],
      })
      const textBlock = response.content.find((b) => b.type === 'text')
      if (!textBlock || textBlock.type !== 'text') {
        return Response.json({ error: 'Extract generation failed. Please try again.' }, { status: 500 })
      }
      noteContent = textBlock.text.trim()
    } catch {
      return Response.json({ error: 'Extract generation failed. Please try again.' }, { status: 500 })
    }

    const firstUserMessage = messages.find((m) => m.role === 'user')
    const titleSnippet = firstUserMessage
      ? firstUserMessage.content.slice(0, 50)
      : 'conversation'
    const title = `Chat extract: ${titleSnippet}`

    const { material, error } = await createProjectMaterial(
      session.project_id,
      org.id,
      user.id,
      {
        material_type: 'note',
        title,
        content: noteContent,
      },
    )

    if (error || !material) {
      return Response.json({ error: 'Extract generated but failed to save' }, { status: 500 })
    }

    return Response.json({ material }, { status: 201 })
  } catch {
    return Response.json({ error: 'Internal error' }, { status: 500 })
  }
}
