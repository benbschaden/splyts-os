-- ============================================================
-- Author Profiles
-- ============================================================
-- Stores per-person voice profiles for AI content generation.
-- One row per author per organisation. No limit on authors.
-- The "Company" option at generation time uses brand_context
-- directly and does not require an author_profiles row.
-- ============================================================

CREATE TABLE author_profiles (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  role            TEXT,
  voice           TEXT,
  tone            TEXT,
  writing_style   TEXT,
  personal_pillars TEXT,
  platform_notes  TEXT,
  created_by      UUID NOT NULL REFERENCES auth.users(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at      TIMESTAMPTZ
);

-- Index for all active authors in an org
CREATE INDEX author_profiles_org_idx ON author_profiles (organization_id)
  WHERE deleted_at IS NULL;

-- Auto-update updated_at on change
CREATE TRIGGER author_profiles_updated_at
  BEFORE UPDATE ON author_profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- -------------------------------------------------------
-- RLS
-- -------------------------------------------------------

ALTER TABLE author_profiles ENABLE ROW LEVEL SECURITY;

-- Any org member can read author profiles
CREATE POLICY "author_profiles_select" ON author_profiles
  FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_members WHERE user_id = auth.uid()
    )
  );

-- Only admins can insert
CREATE POLICY "author_profiles_insert" ON author_profiles
  FOR INSERT
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- Only admins can update
CREATE POLICY "author_profiles_update" ON author_profiles
  FOR UPDATE
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- Only admins can delete
CREATE POLICY "author_profiles_delete" ON author_profiles
  FOR DELETE
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );
