-- ============================================================
-- Backfill default content_types for existing organizations
-- that have none (deleted_at IS NULL).
--
-- New orgs get types from createOrganization in app code; this
-- migration fixes orgs created before that logic existed.
-- ============================================================

INSERT INTO public.content_types (
  organization_id,
  template_id,
  name,
  custom_rules,
  is_active,
  created_by
)
SELECT
  o.id,
  t.id,
  t.name,
  CASE t.slug
    WHEN 'social-post' THEN 'Keep posts under 300 words. Use a strong hook as the first line. No hashtags unless specified.'
    WHEN 'video-script' THEN 'Aim for 5–8 minutes of spoken content. Use a conversational tone. Mark pauses with [PAUSE].'
    WHEN 'long-form' THEN 'Target 800–1200 words. Use subheadings (##). Cite data and examples where possible.'
    WHEN 'blog-post' THEN 'Target 600–1000 words. SEO-friendly subheadings. Write for the reader, not search engines.'
    WHEN 'journal-article' THEN 'Academic tone. Include an abstract. Cite sources inline. Minimum 1000 words.'
    WHEN 'email-newsletter' THEN 'Keep the subject line under 50 characters. Open with a personal hook. One main CTA per email.'
    WHEN 'podcast-script' THEN 'Conversational, not scripted. Write how people speak. Each segment 3–5 minutes of talk time.'
    WHEN 'case-study' THEN 'Lead with the outcome in the headline. Use real numbers. Keep it under 600 words.'
    ELSE ''
  END,
  TRUE,
  m.user_id
FROM public.organizations o
CROSS JOIN public.content_type_templates t
INNER JOIN LATERAL (
  SELECT user_id
  FROM public.organization_members
  WHERE organization_id = o.id
  ORDER BY created_at ASC NULLS LAST
  LIMIT 1
) m ON TRUE
WHERE o.deleted_at IS NULL
  AND NOT EXISTS (
    SELECT 1
    FROM public.content_types ct
    WHERE ct.organization_id = o.id
      AND ct.deleted_at IS NULL
  );
