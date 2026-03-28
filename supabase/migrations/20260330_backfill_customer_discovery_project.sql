-- ============================================================
-- Backfill: Customer Discovery seed + project rows
-- ============================================================
-- Run order: after 20260329_customer_discovery.sql
--
-- Purpose:
-- 1. Idempotent insert into org_project_seeds (safe if 20260329
--    already ran, or if this file is applied alone after a restore).
-- 2. Creates a "Customer Discovery" project for every organization
--    that does not already have one (existing orgs created before
--    the seed existed do not get new projects from signup logic).
--
-- New databases: new orgs still receive all seeds from
-- lib/queries/organizations.ts createOrganization(); this migration
-- only fixes orgs that pre-date the seed or restores from backup.
-- ============================================================

INSERT INTO public.org_project_seeds (name, description, category, visibility, sort_order)
SELECT
  'Customer Discovery',
  'Capture and organise research signal — interviews, reviews, surveys, and observations. Use the Discovery tab to add entries, tag them by theme, and include key insights in AI context.',
  'Research',
  'shared',
  1
WHERE NOT EXISTS (
  SELECT 1 FROM public.org_project_seeds WHERE name = 'Customer Discovery'
);

INSERT INTO public.projects (
  name,
  description,
  organization_id,
  created_by,
  category,
  visibility,
  status
)
SELECT
  'Customer Discovery',
  'Capture and organise research signal — interviews, reviews, surveys, and observations. Use the Discovery tab to add entries, tag them by theme, and include key insights in AI context.',
  o.id,
  member.user_id,
  'Research',
  'shared',
  'active'
FROM public.organizations o
CROSS JOIN LATERAL (
  SELECT om.user_id
  FROM public.organization_members om
  WHERE om.organization_id = o.id
  ORDER BY CASE WHEN om.role = 'admin' THEN 0 ELSE 1 END, om.created_at ASC
  LIMIT 1
) AS member
WHERE o.deleted_at IS NULL
  AND NOT EXISTS (
    SELECT 1
    FROM public.projects p
    WHERE p.organization_id = o.id
      AND p.name = 'Customer Discovery'
      AND p.deleted_at IS NULL
  );
