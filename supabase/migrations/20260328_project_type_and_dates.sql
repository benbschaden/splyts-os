-- ============================================================
-- Project Type and Dates
-- ============================================================
-- Introduces a project_type column to distinguish platform
-- workspaces ("tools") from user-created time-bounded projects.
-- Adds start_date and estimated_end_date to projects so teams
-- can set timelines and track estimation accuracy over time.
-- Also adds project_type to org_project_seeds so seed rows
-- control whether they become tools or projects.
-- ============================================================

-- 1. Add project_type to projects
ALTER TABLE public.projects
  ADD COLUMN project_type TEXT NOT NULL DEFAULT 'project'
  CHECK (project_type IN ('project', 'tool'));

-- 2. Add timeline columns to projects
ALTER TABLE public.projects
  ADD COLUMN start_date DATE,
  ADD COLUMN estimated_end_date DATE;

-- 3. Add project_type to org_project_seeds
ALTER TABLE public.org_project_seeds
  ADD COLUMN project_type TEXT NOT NULL DEFAULT 'project'
  CHECK (project_type IN ('project', 'tool'));

-- 4. Mark the seeded workspaces as tools in org_project_seeds
UPDATE public.org_project_seeds
SET project_type = 'tool'
WHERE name IN ('Marketing Content', 'Customer Discovery');

-- 5. Backfill existing org projects that were created from those seeds
--    Matches by name — seeded tool workspaces have standardised names.
UPDATE public.projects
SET project_type = 'tool'
WHERE name IN ('Marketing Content', 'Customer Discovery')
  AND deleted_at IS NULL;

-- 6. Index for fast filtering by type (used in tools vs projects split)
CREATE INDEX idx_projects_project_type
  ON public.projects (organization_id, project_type)
  WHERE deleted_at IS NULL;
