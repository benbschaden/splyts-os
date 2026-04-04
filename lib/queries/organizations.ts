import { cache } from 'react'
import { createServiceClient } from '@/lib/supabase/service'
import { seedTeamsForOrg } from '@/lib/queries/teams'

// Wrapped with React cache() so multiple calls within a single render
// (e.g. dashboard layout + page) share one DB round-trip.
// Uses service client — trusted server-side lookup, not user-initiated.
// RLS on organization_members cannot be used here because this function
// is called to determine IF the user has an org (before RLS can help).
export const getOrganizationForUser = cache(async function getOrganizationForUser(userId: string) {
  const supabase = createServiceClient()

  const { data: membership } = await supabase
    .from('organization_members')
    .select('organization_id, role')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (!membership) return null

  const { data: org } = await supabase
    .from('organizations')
    .select('id, name')
    .eq('id', membership.organization_id)
    .is('deleted_at', null)
    .maybeSingle()

  if (!org) return null

  return {
    id: org.id,
    name: org.name,
    role: membership.role,
  }
})

// Uses service role to bypass RLS — valid because this is a trusted first-time
// setup operation where the user has no org yet and cannot pass RLS checks.
export async function createOrganization(name: string, userId: string) {
  const supabase = createServiceClient()

  const { data: org, error: orgError } = await supabase
    .from('organizations')
    .insert({ name })
    .select('id, name')
    .single()

  if (orgError || !org) {
    return { organization: null, error: 'Failed to create organization' }
  }

  const { error: memberError } = await supabase
    .from('organization_members')
    .insert({
      organization_id: org.id,
      user_id: userId,
      role: 'admin' as const,
    })

  if (memberError) {
    return { organization: null, error: 'Failed to assign admin role' }
  }

  // Seed default projects from org_project_seeds table.
  // Details live in the database — no project names hardcoded here.
  const { data: seeds } = await supabase
    .from('org_project_seeds')
    .select('name, description, category, project_type')
    .eq('is_active', true)
    .order('sort_order', { ascending: true })

  if (seeds && seeds.length > 0) {
    await supabase.from('projects').insert(
      seeds.map((seed) => ({
        name: seed.name,
        description: seed.description,
        category: seed.category ?? null,
        project_type: seed.project_type ?? 'project',
        organization_id: org.id,
        created_by: userId,
      })),
    )
  }

  // Seed default teams from org_team_seeds
  await seedTeamsForOrg(org.id, userId)

  // Seed default content types from templates.
  // Each template gets one active content type so the org is ready to generate
  // immediately without needing to configure anything first.
  const { data: templates } = await supabase
    .from('content_type_templates')
    .select('id, slug, name')
    .order('name', { ascending: true })

  if (templates && templates.length > 0) {
    const DEFAULT_CUSTOM_RULES: Record<string, string> = {
      'social-post':        'Keep posts under 300 words. Use a strong hook as the first line. No hashtags unless specified.',
      'video-script':       'Aim for 5–8 minutes of spoken content. Use a conversational tone. Mark pauses with [PAUSE].',
      'long-form':          'Target 800–1200 words. Use subheadings (##). Cite data and examples where possible.',
      'blog-post':          'Target 600–1000 words. SEO-friendly subheadings. Write for the reader, not search engines.',
      'journal-article':    'Academic tone. Include an abstract. Cite sources inline. Minimum 1000 words.',
      'email-newsletter':   'Keep the subject line under 50 characters. Open with a personal hook. One main CTA per email.',
      'podcast-script':     'Conversational, not scripted. Write how people speak. Each segment 3–5 minutes of talk time.',
      'case-study':         'Lead with the outcome in the headline. Use real numbers. Keep it under 600 words.',
    }

    await supabase.from('content_types').insert(
      templates.map((t) => ({
        organization_id: org.id,
        template_id: t.id,
        name: t.name,
        custom_rules: DEFAULT_CUSTOM_RULES[t.slug] ?? '',
        is_active: true,
        created_by: userId,
      })),
    )
  }

  return { organization: org, error: null }
}
