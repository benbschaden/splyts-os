-- ============================================================
-- Personas
-- ============================================================
-- Stores target audience personas for the organisation.
-- One org can have many personas. Each persona has structured
-- fields covering demographics, goals, frustrations, behaviours
-- and more — giving AI rich audience context.
-- ============================================================

CREATE TABLE personas (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  tagline         TEXT,
  age_range       TEXT,
  job_title       TEXT,
  industry        TEXT,
  company_size    TEXT,
  location        TEXT,
  goals           TEXT,
  frustrations    TEXT,
  motivations     TEXT,
  behaviors       TEXT,
  values          TEXT,
  channels        TEXT,
  buying_triggers TEXT,
  objections      TEXT,
  quote           TEXT,
  include_in_ai   BOOLEAN NOT NULL DEFAULT true,
  created_by      UUID NOT NULL REFERENCES auth.users(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at      TIMESTAMPTZ
);

CREATE INDEX personas_org_idx ON personas (organization_id)
  WHERE deleted_at IS NULL;

CREATE TRIGGER personas_updated_at
  BEFORE UPDATE ON personas
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- -------------------------------------------------------
-- RLS
-- -------------------------------------------------------
ALTER TABLE personas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "personas_select" ON personas
  FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_members WHERE user_id = auth.uid()
    )
    AND deleted_at IS NULL
  );

CREATE POLICY "personas_insert" ON personas
  FOR INSERT
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "personas_update" ON personas
  FOR UPDATE
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "personas_delete" ON personas
  FOR DELETE
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );
