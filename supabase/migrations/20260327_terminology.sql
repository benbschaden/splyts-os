CREATE TABLE terminology (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  term            TEXT NOT NULL,
  preferred       TEXT NOT NULL,
  avoid           TEXT,
  context         TEXT,
  category        TEXT NOT NULL DEFAULT 'general',
  sort_order      INTEGER NOT NULL DEFAULT 0,
  created_by      UUID NOT NULL REFERENCES auth.users(id),
  updated_by      UUID REFERENCES auth.users(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at      TIMESTAMPTZ
);

CREATE INDEX terminology_org_idx ON terminology (organization_id) WHERE deleted_at IS NULL;

ALTER TABLE terminology ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view terminology" ON terminology FOR SELECT
  USING (organization_id IN (SELECT organization_id FROM organization_members WHERE user_id = auth.uid()));

CREATE POLICY "Admins can insert terminology" ON terminology FOR INSERT
  WITH CHECK (organization_id IN (SELECT organization_id FROM organization_members WHERE user_id = auth.uid() AND role = 'admin'));

CREATE POLICY "Admins can update terminology" ON terminology FOR UPDATE
  USING (organization_id IN (SELECT organization_id FROM organization_members WHERE user_id = auth.uid() AND role = 'admin'));

CREATE POLICY "Admins can delete terminology" ON terminology FOR DELETE
  USING (organization_id IN (SELECT organization_id FROM organization_members WHERE user_id = auth.uid() AND role = 'admin'));
