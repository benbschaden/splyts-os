-- Platform guidelines: per-platform content rules
CREATE TABLE platform_guidelines (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  platform_name   TEXT NOT NULL,
  guidelines      TEXT NOT NULL,
  format_notes    TEXT,
  cadence         TEXT,
  include_in_ai   BOOLEAN NOT NULL DEFAULT true,
  sort_order      INTEGER NOT NULL DEFAULT 0,
  created_by      UUID NOT NULL REFERENCES auth.users(id),
  updated_by      UUID REFERENCES auth.users(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at      TIMESTAMPTZ
);

CREATE INDEX platform_guidelines_org_idx
  ON platform_guidelines (organization_id) WHERE deleted_at IS NULL;

ALTER TABLE platform_guidelines ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view platform guidelines"
  ON platform_guidelines FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can insert platform guidelines"
  ON platform_guidelines FOR INSERT
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Admins can update platform guidelines"
  ON platform_guidelines FOR UPDATE
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Admins can delete platform guidelines"
  ON platform_guidelines FOR DELETE
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );
