-- ============================================================
-- Customer Discovery
-- ============================================================
-- Adds discovery_entries for capturing structured research
-- signal (interviews, reviews, surveys, observations) at the
-- project level. Includes embedding support for semantic
-- retrieval in project-scoped chat. Also seeds a default
-- Customer Discovery project for every new organisation.
-- ============================================================

-- -------------------------------------------------------
-- 1. discovery_entries
-- -------------------------------------------------------

CREATE TABLE public.discovery_entries (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  project_id      UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  created_by      UUID NOT NULL REFERENCES auth.users(id),

  -- Core fields (all types)
  entry_type      TEXT NOT NULL
                  CHECK (entry_type IN ('interview', 'review', 'survey', 'observation')),
  source          TEXT,
  entry_date      DATE,
  raw_content     TEXT NOT NULL,
  sentiment       TEXT
                  CHECK (sentiment IN ('positive', 'neutral', 'negative', 'mixed')),
  tags            TEXT[] NOT NULL DEFAULT '{}',
  include_in_ai   BOOLEAN NOT NULL DEFAULT false,

  -- Interview-specific
  user_segment    TEXT
                  CHECK (user_segment IN ('new', 'active', 'power', 'churned', 'free', 'paid')),
  key_quote_1     TEXT,
  key_quote_2     TEXT,
  key_quote_3     TEXT,
  jtbd            TEXT,

  -- Review-specific
  star_rating     INTEGER CHECK (star_rating BETWEEN 1 AND 5),
  platform        TEXT
                  CHECK (platform IN ('app_store', 'product_hunt', 'g2', 'reddit', 'twitter', 'other')),

  -- Optional link back to an uploaded source file in project_materials
  source_material_id UUID REFERENCES public.project_materials(id) ON DELETE SET NULL,

  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at      TIMESTAMPTZ
);

CREATE INDEX discovery_entries_project_idx
  ON public.discovery_entries (project_id) WHERE deleted_at IS NULL;

CREATE INDEX discovery_entries_org_idx
  ON public.discovery_entries (organization_id) WHERE deleted_at IS NULL;

CREATE INDEX discovery_entries_type_idx
  ON public.discovery_entries (organization_id, entry_type) WHERE deleted_at IS NULL;

CREATE INDEX discovery_entries_tags_idx
  ON public.discovery_entries USING GIN (tags) WHERE deleted_at IS NULL;

CREATE INDEX discovery_entries_ai_idx
  ON public.discovery_entries (project_id, include_in_ai) WHERE deleted_at IS NULL;

CREATE TRIGGER discovery_entries_updated_at
  BEFORE UPDATE ON public.discovery_entries
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

ALTER TABLE public.discovery_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "discovery_entries_select" ON public.discovery_entries
  FOR SELECT
  USING (
    deleted_at IS NULL
    AND organization_id IN (
      SELECT organization_id FROM public.organization_members
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "discovery_entries_insert" ON public.discovery_entries
  FOR INSERT
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM public.organization_members
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "discovery_entries_update" ON public.discovery_entries
  FOR UPDATE
  USING (
    organization_id IN (
      SELECT organization_id FROM public.organization_members
      WHERE user_id = auth.uid()
    )
    AND deleted_at IS NULL
  );

CREATE POLICY "discovery_entries_delete" ON public.discovery_entries
  FOR DELETE
  USING (
    organization_id IN (
      SELECT organization_id FROM public.organization_members
      WHERE user_id = auth.uid()
    )
  );

-- -------------------------------------------------------
-- 2. discovery_entry_embeddings
-- -------------------------------------------------------

CREATE TABLE public.discovery_entry_embeddings (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entry_id    UUID NOT NULL REFERENCES public.discovery_entries(id) ON DELETE CASCADE,
  content     TEXT NOT NULL,
  embedding   vector(1536),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (entry_id)
);

CREATE INDEX discovery_entry_embeddings_vector_idx
  ON public.discovery_entry_embeddings
  USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

ALTER TABLE public.discovery_entry_embeddings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users see discovery embeddings for their org"
  ON public.discovery_entry_embeddings FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.discovery_entries de
      JOIN public.organization_members om ON om.organization_id = de.organization_id
      WHERE de.id = discovery_entry_embeddings.entry_id
        AND om.user_id = auth.uid()
        AND de.deleted_at IS NULL
    )
  );

CREATE POLICY "Service can manage discovery embeddings"
  ON public.discovery_entry_embeddings FOR ALL
  USING (true)
  WITH CHECK (true);

-- -------------------------------------------------------
-- 3. Seed: Customer Discovery default project
-- -------------------------------------------------------

INSERT INTO public.org_project_seeds (name, description, category, visibility, sort_order)
VALUES (
  'Customer Discovery',
  'Capture and organise research signal — interviews, reviews, surveys, and observations. Use the Discovery tab to add entries, tag them by theme, and include key insights in AI context.',
  'Research',
  'shared',
  1
);
