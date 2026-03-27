-- ============================================================
-- Business Plans
-- ============================================================
-- Stores one business plan per organisation as structured JSONB.
-- Each section has a key, and the value is free-text content
-- filled in by the user. The section *definitions* (labels,
-- descriptions, order) live in application code so they can
-- evolve without a migration.
-- ============================================================

CREATE TABLE business_plans (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE UNIQUE,
  sections        JSONB NOT NULL DEFAULT '{}',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX business_plans_org_idx ON business_plans (organization_id);

CREATE TRIGGER business_plans_updated_at
  BEFORE UPDATE ON business_plans
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- -------------------------------------------------------
-- RLS
-- -------------------------------------------------------
ALTER TABLE business_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "business_plans_select" ON business_plans
  FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "business_plans_insert" ON business_plans
  FOR INSERT
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "business_plans_update" ON business_plans
  FOR UPDATE
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );
