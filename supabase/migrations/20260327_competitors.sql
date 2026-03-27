CREATE TABLE competitors (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  website         TEXT,
  positioning     TEXT,
  strengths       TEXT,
  weaknesses      TEXT,
  pricing_notes   TEXT,
  battle_card     TEXT,
  include_in_ai   BOOLEAN NOT NULL DEFAULT true,
  sort_order      INTEGER NOT NULL DEFAULT 0,
  created_by      UUID NOT NULL REFERENCES auth.users(id),
  updated_by      UUID REFERENCES auth.users(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at      TIMESTAMPTZ
);

CREATE INDEX competitors_org_idx ON competitors (organization_id) WHERE deleted_at IS NULL;

ALTER TABLE competitors ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view competitors" ON competitors FOR SELECT
  USING (organization_id IN (SELECT organization_id FROM organization_members WHERE user_id = auth.uid()));

CREATE POLICY "Admins can insert competitors" ON competitors FOR INSERT
  WITH CHECK (organization_id IN (SELECT organization_id FROM organization_members WHERE user_id = auth.uid() AND role = 'admin'));

CREATE POLICY "Admins can update competitors" ON competitors FOR UPDATE
  USING (organization_id IN (SELECT organization_id FROM organization_members WHERE user_id = auth.uid() AND role = 'admin'));

CREATE POLICY "Admins can delete competitors" ON competitors FOR DELETE
  USING (organization_id IN (SELECT organization_id FROM organization_members WHERE user_id = auth.uid() AND role = 'admin'));
