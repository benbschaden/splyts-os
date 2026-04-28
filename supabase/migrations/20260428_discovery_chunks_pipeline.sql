-- ============================================================
-- Discovery Chunked Analysis Pipeline
-- ============================================================
-- Replaces the single-call analyse and 500-char-excerpt
-- synthesise paths with a chunk -> map -> verify -> reduce
-- pipeline so long transcripts (60-90 min interviews) and
-- studies of 10-20 such interviews can be analysed without
-- silently dropping content or hallucinating quotes.
--
-- Adds:
--   1. discovery_entry_chunks         (chunk text + verified findings)
--   2. discovery_study_synthesis_runs (provenance per synthesis)
--   3. discovery_entries.analysis_json
--   4. discovery_entries.raw_content_hash
-- ============================================================

-- -------------------------------------------------------
-- 1. Per-entry analysis columns
-- -------------------------------------------------------
ALTER TABLE public.discovery_entries
  ADD COLUMN IF NOT EXISTS analysis_json    JSONB,
  ADD COLUMN IF NOT EXISTS raw_content_hash TEXT,
  ADD COLUMN IF NOT EXISTS analysis_markdown TEXT;

-- -------------------------------------------------------
-- 2. discovery_entry_chunks
-- -------------------------------------------------------
CREATE TABLE public.discovery_entry_chunks (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entry_id        UUID NOT NULL REFERENCES public.discovery_entries(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,

  chunk_index     INTEGER NOT NULL,
  start_offset    INTEGER NOT NULL,
  end_offset      INTEGER NOT NULL,
  text            TEXT NOT NULL,

  -- Verified findings: nullable while pending
  findings_json       JSONB,
  verification_stats  JSONB,

  status          TEXT NOT NULL DEFAULT 'pending'
                  CHECK (status IN ('pending','succeeded','failed')),
  error           TEXT,

  model_id        TEXT,
  prompt_version  TEXT,

  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE (entry_id, chunk_index),
  CHECK (start_offset >= 0),
  CHECK (end_offset >= start_offset)
);

CREATE INDEX discovery_entry_chunks_entry_idx
  ON public.discovery_entry_chunks (entry_id);

CREATE INDEX discovery_entry_chunks_org_idx
  ON public.discovery_entry_chunks (organization_id);

CREATE TRIGGER discovery_entry_chunks_updated_at
  BEFORE UPDATE ON public.discovery_entry_chunks
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

ALTER TABLE public.discovery_entry_chunks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "discovery_entry_chunks_select" ON public.discovery_entry_chunks
  FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM public.organization_members
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "discovery_entry_chunks_insert" ON public.discovery_entry_chunks
  FOR INSERT
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM public.organization_members
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "discovery_entry_chunks_update" ON public.discovery_entry_chunks
  FOR UPDATE
  USING (
    organization_id IN (
      SELECT organization_id FROM public.organization_members
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "discovery_entry_chunks_delete" ON public.discovery_entry_chunks
  FOR DELETE
  USING (
    organization_id IN (
      SELECT organization_id FROM public.organization_members
      WHERE user_id = auth.uid()
    )
  );

-- -------------------------------------------------------
-- 3. discovery_study_synthesis_runs
-- -------------------------------------------------------
CREATE TABLE public.discovery_study_synthesis_runs (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  study_id           UUID NOT NULL REFERENCES public.discovery_studies(id) ON DELETE CASCADE,
  organization_id    UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  created_by         UUID REFERENCES auth.users(id),

  model_id           TEXT,
  prompt_version     TEXT,

  entries_included   INTEGER NOT NULL DEFAULT 0,
  chunks_consulted   INTEGER NOT NULL DEFAULT 0,
  quotes_dropped     INTEGER NOT NULL DEFAULT 0,

  status             TEXT NOT NULL DEFAULT 'running'
                     CHECK (status IN ('running','succeeded','failed')),
  analysis_markdown  TEXT,
  error              TEXT,

  started_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at       TIMESTAMPTZ
);

CREATE INDEX discovery_study_synthesis_runs_study_idx
  ON public.discovery_study_synthesis_runs (study_id);

CREATE INDEX discovery_study_synthesis_runs_org_idx
  ON public.discovery_study_synthesis_runs (organization_id);

ALTER TABLE public.discovery_study_synthesis_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "discovery_study_synthesis_runs_select" ON public.discovery_study_synthesis_runs
  FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM public.organization_members
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "discovery_study_synthesis_runs_insert" ON public.discovery_study_synthesis_runs
  FOR INSERT
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM public.organization_members
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "discovery_study_synthesis_runs_update" ON public.discovery_study_synthesis_runs
  FOR UPDATE
  USING (
    organization_id IN (
      SELECT organization_id FROM public.organization_members
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "discovery_study_synthesis_runs_delete" ON public.discovery_study_synthesis_runs
  FOR DELETE
  USING (
    organization_id IN (
      SELECT organization_id FROM public.organization_members
      WHERE user_id = auth.uid()
    )
  );
