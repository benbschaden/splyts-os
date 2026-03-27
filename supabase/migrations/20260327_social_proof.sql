CREATE TABLE social_proof (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  proof_type      TEXT NOT NULL DEFAULT 'testimonial',
  quote           TEXT,
  attribution     TEXT,
  company         TEXT,
  metric_value    TEXT,
  metric_label    TEXT,
  tags            TEXT[] DEFAULT '{}',
  approved        BOOLEAN NOT NULL DEFAULT false,
  include_in_ai   BOOLEAN NOT NULL DEFAULT true,
  sort_order      INTEGER NOT NULL DEFAULT 0,
  created_by      UUID NOT NULL REFERENCES auth.users(id),
  updated_by      UUID REFERENCES auth.users(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at      TIMESTAMPTZ
);

CREATE INDEX social_proof_org_idx ON social_proof (organization_id) WHERE deleted_at IS NULL;

ALTER TABLE social_proof ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view social proof" ON social_proof FOR SELECT
  USING (organization_id IN (SELECT organization_id FROM organization_members WHERE user_id = auth.uid()));

CREATE POLICY "Admins can insert social proof" ON social_proof FOR INSERT
  WITH CHECK (organization_id IN (SELECT organization_id FROM organization_members WHERE user_id = auth.uid() AND role = 'admin'));

CREATE POLICY "Admins can update social proof" ON social_proof FOR UPDATE
  USING (organization_id IN (SELECT organization_id FROM organization_members WHERE user_id = auth.uid() AND role = 'admin'));

CREATE POLICY "Admins can delete social proof" ON social_proof FOR DELETE
  USING (organization_id IN (SELECT organization_id FROM organization_members WHERE user_id = auth.uid() AND role = 'admin'));
