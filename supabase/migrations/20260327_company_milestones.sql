-- Company milestones: dated timeline of company-level achievements
CREATE TABLE company_milestones (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  title           TEXT NOT NULL,
  description     TEXT,
  milestone_date  DATE NOT NULL,
  category        TEXT NOT NULL DEFAULT 'other'
                  CHECK (category IN ('fundraising', 'hiring', 'launch', 'revenue', 'partnership', 'product', 'other')),
  status          TEXT NOT NULL DEFAULT 'planned'
                  CHECK (status IN ('planned', 'achieved', 'missed', 'pushed')),
  sort_order      INTEGER NOT NULL DEFAULT 0,
  created_by      UUID NOT NULL REFERENCES auth.users(id),
  updated_by      UUID REFERENCES auth.users(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at      TIMESTAMPTZ
);

CREATE INDEX company_milestones_org_date_idx
  ON company_milestones (organization_id, milestone_date) WHERE deleted_at IS NULL;

ALTER TABLE company_milestones ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view milestones"
  ON company_milestones FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can insert milestones"
  ON company_milestones FOR INSERT
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Admins can update milestones"
  ON company_milestones FOR UPDATE
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Admins can delete milestones"
  ON company_milestones FOR DELETE
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );
