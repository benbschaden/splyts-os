CREATE TABLE brand_narratives (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  title           TEXT NOT NULL,
  narrative       TEXT NOT NULL,
  usage_context   TEXT,
  include_in_ai   BOOLEAN NOT NULL DEFAULT true,
  sort_order      INTEGER NOT NULL DEFAULT 0,
  created_by      UUID NOT NULL REFERENCES auth.users(id),
  updated_by      UUID REFERENCES auth.users(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at      TIMESTAMPTZ
);

CREATE INDEX brand_narratives_org_idx ON brand_narratives (organization_id) WHERE deleted_at IS NULL;

ALTER TABLE brand_narratives ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view brand narratives" ON brand_narratives FOR SELECT
  USING (organization_id IN (SELECT organization_id FROM organization_members WHERE user_id = auth.uid()));

CREATE POLICY "Admins can insert brand narratives" ON brand_narratives FOR INSERT
  WITH CHECK (organization_id IN (SELECT organization_id FROM organization_members WHERE user_id = auth.uid() AND role = 'admin'));

CREATE POLICY "Admins can update brand narratives" ON brand_narratives FOR UPDATE
  USING (organization_id IN (SELECT organization_id FROM organization_members WHERE user_id = auth.uid() AND role = 'admin'));

CREATE POLICY "Admins can delete brand narratives" ON brand_narratives FOR DELETE
  USING (organization_id IN (SELECT organization_id FROM organization_members WHERE user_id = auth.uid() AND role = 'admin'));
