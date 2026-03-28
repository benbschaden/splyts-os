-- ============================================================
-- Content Studio
-- ============================================================
-- 1. Add tool_key to org_project_seeds and projects
-- 2. Rename "Marketing Content" seed → "Content Studio"
-- 3. Backfill existing project rows
-- 4. Create content_ideas table with RLS
-- 5. Add time-windowed performance columns to outputs
-- ============================================================

-- 1. tool_key column on both tables
ALTER TABLE org_project_seeds
  ADD COLUMN IF NOT EXISTS tool_key TEXT;

ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS tool_key TEXT;

-- 2. Update seed: rename + assign tool_key
UPDATE org_project_seeds
SET
  name        = 'Content Studio',
  description = 'Plan, generate, and track the performance of all content.',
  tool_key    = 'content_studio'
WHERE name = 'Marketing Content';

-- 3. Backfill existing projects seeded as Marketing Content
UPDATE projects
SET
  name     = 'Content Studio',
  tool_key = 'content_studio'
WHERE name = 'Marketing Content'
  AND project_type = 'tool'
  AND deleted_at IS NULL;

-- 4. content_ideas table
CREATE TABLE IF NOT EXISTS public.content_ideas (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id  UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  project_id       UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  title            TEXT NOT NULL CHECK (char_length(title) BETWEEN 1 AND 500),
  description      TEXT CHECK (char_length(description) <= 2000),
  platform         TEXT NOT NULL,
  platform_owner   TEXT NOT NULL CHECK (platform_owner IN ('author', 'company')),
  status           TEXT NOT NULL DEFAULT 'idea' CHECK (status IN ('idea', 'in_progress', 'done')),
  created_by       UUID NOT NULL REFERENCES auth.users(id),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at       TIMESTAMPTZ
);

ALTER TABLE public.content_ideas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "content_ideas_org_members"
  ON public.content_ideas FOR ALL
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid()
    )
  );

CREATE INDEX IF NOT EXISTS content_ideas_project_idx
  ON public.content_ideas (project_id, created_at DESC)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS content_ideas_org_idx
  ON public.content_ideas (organization_id, created_at DESC)
  WHERE deleted_at IS NULL;

-- 5. New time-windowed performance columns on outputs
ALTER TABLE public.outputs
  ADD COLUMN IF NOT EXISTS views_1d                INTEGER,
  ADD COLUMN IF NOT EXISTS views_7d                INTEGER,
  ADD COLUMN IF NOT EXISTS views_30d               INTEGER,
  ADD COLUMN IF NOT EXISTS website_visits          INTEGER,
  ADD COLUMN IF NOT EXISTS email_signups           INTEGER,
  ADD COLUMN IF NOT EXISTS performance_recorded_at TIMESTAMPTZ;

-- Index to efficiently fetch published outputs org-wide (Content Studio Published tab)
CREATE INDEX IF NOT EXISTS outputs_published_org_idx
  ON public.outputs (organization_id, published_at DESC)
  WHERE published_at IS NOT NULL AND deleted_at IS NULL;
