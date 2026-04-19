import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@/lib/supabase/server'
import { getOrganizationForUser } from '@/lib/queries/organizations'
import { getDiscoveryEntries } from '@/lib/queries/discovery-entries'
import { updateDiscoveryStudy } from '@/lib/queries/discovery-studies'
import { buildStudySynthesisPrompt } from '@/lib/ai/prompts'
import type { StudyEntryDigest } from '@/lib/ai/prompts'
import { createUntypedServiceClient } from '@/lib/supabase/service'

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  try {
    const { id } = await params

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

    const org = await getOrganizationForUser(user.id)
    if (!org) return Response.json({ error: 'Not found' }, { status: 404 })

    // Fetch the study and verify org ownership
    const serviceClient = createUntypedServiceClient()
    const { data: studyData, error: studyError } = await serviceClient
      .from('discovery_studies')
      .select('id, name, goal, method, project_id, organization_id')
      .eq('id', id)
      .eq('organization_id', org.id)
      .is('deleted_at', null)
      .single()

    if (studyError || !studyData) {
      return Response.json({ error: 'Not found' }, { status: 404 })
    }

    const study = studyData as {
      id: string
      name: string
      goal: string | null
      method: string | null
      project_id: string
      organization_id: string
    }

    // Fetch all entries for this study
    const allEntries = await getDiscoveryEntries(study.project_id, org.id)
    const entries = allEntries.filter((e) => e.study_id === id)

    if (entries.length === 0) {
      return Response.json({ error: 'No entries in this study to synthesise' }, { status: 400 })
    }

    // Build digest — avoid sending full raw_content to reduce token cost; send first 500 chars
    const digests: StudyEntryDigest[] = entries.map((e) => ({
      participant: e.participant,
      entry_type: e.entry_type,
      sentiment: e.sentiment,
      tags: e.tags ?? [],
      key_quote_1: e.key_quote_1,
      key_quote_2: e.key_quote_2,
      key_quote_3: e.key_quote_3,
      jtbd: e.jtbd,
      wtp_signal: e.wtp_signal ?? null,
      wtp_price_points: (e.wtp_price_points as number[] | null) ?? [],
      problem_severity: e.problem_severity ?? null,
      adoption_willingness: e.adoption_willingness ?? null,
      raw_content_excerpt: e.raw_content.slice(0, 500) + (e.raw_content.length > 500 ? '…' : ''),
    }))

    const prompt = buildStudySynthesisPrompt({
      studyName: study.name,
      studyGoal: study.goal,
      method: study.method,
      entries: digests,
    })

    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY!, maxRetries: 4 })
    const response = await anthropic.messages.create({
      model: 'claude-opus-4-6',
      max_tokens: 4096,
      messages: [{ role: 'user', content: prompt }],
    })

    const analysisMarkdown = response.content
      .filter((c) => c.type === 'text')
      .map((c) => (c as { type: 'text'; text: string }).text)
      .join('')
      .trim()

    // Save directly to the study
    const { study: updated, error: saveError } = await updateDiscoveryStudy(id, org.id, {
      analysis_markdown: analysisMarkdown,
    })

    if (saveError || !updated) {
      return Response.json({ error: 'Analysis generated but failed to save' }, { status: 500 })
    }

    return Response.json({ data: { analysis_markdown: analysisMarkdown } })
  } catch (err) {
    console.error('[synthesise] Unexpected error:', err)
    return Response.json({ error: 'Internal error' }, { status: 500 })
  }
}
