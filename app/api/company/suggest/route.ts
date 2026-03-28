import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { getOrganizationForUser } from '@/lib/queries/organizations'
import {
  getKnowledgeFilesWithText,
  countActiveConflicts,
} from '@/lib/queries/company-knowledge'
import { suggestField } from '@/lib/company/suggest-field'

const schema = z.object({
  field_key: z.string().min(1).max(100),
  field_label: z.string().min(1).max(200),
  field_hint: z.string().max(500).default(''),
  current_form_values: z.record(z.string(), z.string()),
})

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

    const org = await getOrganizationForUser(user.id)
    if (!org) return Response.json({ error: 'Not found' }, { status: 404 })

    const body = await request.json()
    const parsed = schema.safeParse(body)
    if (!parsed.success) {
      return Response.json(
        { error: 'Invalid input', details: parsed.error.flatten().fieldErrors },
        { status: 400 },
      )
    }

    const { field_key, field_label, field_hint, current_form_values } = parsed.data

    const service = createServiceClient()

    const [{ data: filesRaw }, conflictCount] = await Promise.all([
      getKnowledgeFilesWithText(service, org.id),
      countActiveConflicts(service, org.id),
    ])

    const knowledgeDocs = (filesRaw ?? [])
      .filter((f): f is typeof f & { processed_text: string } => f.processed_text !== null)
      .map((f) => ({ fileName: f.file_name, text: f.processed_text }))

    const result = await suggestField({
      fieldKey: field_key,
      fieldLabel: field_label,
      fieldHint: field_hint,
      currentFormValues: current_form_values,
      knowledgeDocs,
      hasActiveConflicts: conflictCount > 0,
    })

    return Response.json({
      suggestion: result.suggestion,
      sources: result.sources,
      has_conflicts: conflictCount > 0,
    })
  } catch (err) {
    console.error('[company/suggest POST]', err)
    return Response.json({ error: 'Suggestion failed. Please try again.' }, { status: 500 })
  }
}
