-- ============================================================
-- Discovery Studies
-- ============================================================
-- Adds discovery_studies to organise research efforts within
-- the Customer Discovery tool. Each study has a name, goal,
-- method, a script (interview guide / question set), and an
-- analysis (synthesis written after the study concludes).
--
-- Also:
--   - Adds study_id FK to discovery_entries so entries belong
--     to a study (nullable — existing entries are unsorted)
--   - Extends entry_type to include 'email' for beta feedback
-- ============================================================

-- -------------------------------------------------------
-- 1. Extend entry_type to include 'email'
-- -------------------------------------------------------
ALTER TABLE public.discovery_entries
  DROP CONSTRAINT IF EXISTS discovery_entries_entry_type_check;

ALTER TABLE public.discovery_entries
  ADD CONSTRAINT discovery_entries_entry_type_check
  CHECK (entry_type IN ('interview', 'review', 'survey', 'observation', 'email'));

-- -------------------------------------------------------
-- 2. discovery_studies
-- -------------------------------------------------------
CREATE TABLE public.discovery_studies (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  project_id      UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  created_by      UUID NOT NULL REFERENCES auth.users(id),

  name            TEXT NOT NULL,
  goal            TEXT,
  method          TEXT
                  CHECK (method IN ('interview', 'review', 'survey', 'observation', 'email', 'mixed')),
  script_markdown TEXT,
  analysis_markdown TEXT,
  status          TEXT NOT NULL DEFAULT 'active'
                  CHECK (status IN ('active', 'complete', 'archived')),
  sort_order      INTEGER NOT NULL DEFAULT 0,

  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at      TIMESTAMPTZ
);

CREATE INDEX discovery_studies_project_idx
  ON public.discovery_studies (project_id) WHERE deleted_at IS NULL;

CREATE INDEX discovery_studies_org_idx
  ON public.discovery_studies (organization_id) WHERE deleted_at IS NULL;

CREATE TRIGGER discovery_studies_updated_at
  BEFORE UPDATE ON public.discovery_studies
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

ALTER TABLE public.discovery_studies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "discovery_studies_select" ON public.discovery_studies
  FOR SELECT
  USING (
    deleted_at IS NULL
    AND organization_id IN (
      SELECT organization_id FROM public.organization_members
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "discovery_studies_insert" ON public.discovery_studies
  FOR INSERT
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM public.organization_members
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "discovery_studies_update" ON public.discovery_studies
  FOR UPDATE
  USING (
    organization_id IN (
      SELECT organization_id FROM public.organization_members
      WHERE user_id = auth.uid()
    )
    AND deleted_at IS NULL
  );

CREATE POLICY "discovery_studies_delete" ON public.discovery_studies
  FOR DELETE
  USING (
    organization_id IN (
      SELECT organization_id FROM public.organization_members
      WHERE user_id = auth.uid()
    )
  );

-- -------------------------------------------------------
-- 3. Add study_id FK to discovery_entries
-- -------------------------------------------------------
ALTER TABLE public.discovery_entries
  ADD COLUMN study_id UUID REFERENCES public.discovery_studies(id) ON DELETE SET NULL;

CREATE INDEX discovery_entries_study_idx
  ON public.discovery_entries (study_id) WHERE deleted_at IS NULL;
