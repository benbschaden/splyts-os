-- ============================================================
-- KPI definitions, snapshots, funnels, and funnel stages
-- ============================================================

-- 1. KPI DEFINITIONS — what metrics an org tracks
CREATE TABLE kpi_definitions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  unit            TEXT NOT NULL DEFAULT 'count',
  category        TEXT NOT NULL DEFAULT 'custom',
  description     TEXT,
  is_highlighted  BOOLEAN NOT NULL DEFAULT false,
  sort_order      INTEGER NOT NULL DEFAULT 0,
  created_by      UUID NOT NULL REFERENCES auth.users(id),
  updated_by      UUID REFERENCES auth.users(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at      TIMESTAMPTZ
);

CREATE INDEX kpi_definitions_org_idx ON kpi_definitions (organization_id) WHERE deleted_at IS NULL;

ALTER TABLE kpi_definitions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view kpi_definitions" ON kpi_definitions FOR SELECT
  USING (organization_id IN (SELECT organization_id FROM organization_members WHERE user_id = auth.uid()));
CREATE POLICY "Admins can insert kpi_definitions" ON kpi_definitions FOR INSERT
  WITH CHECK (organization_id IN (SELECT organization_id FROM organization_members WHERE user_id = auth.uid() AND role = 'admin'));
CREATE POLICY "Admins can update kpi_definitions" ON kpi_definitions FOR UPDATE
  USING (organization_id IN (SELECT organization_id FROM organization_members WHERE user_id = auth.uid() AND role = 'admin'));
CREATE POLICY "Admins can delete kpi_definitions" ON kpi_definitions FOR DELETE
  USING (organization_id IN (SELECT organization_id FROM organization_members WHERE user_id = auth.uid() AND role = 'admin'));

-- 2. KPI SNAPSHOTS — weekly metric values
CREATE TABLE kpi_snapshots (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  snapshot_date   DATE NOT NULL,
  values          JSONB NOT NULL DEFAULT '{}',
  notes           TEXT,
  created_by      UUID NOT NULL REFERENCES auth.users(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX kpi_snapshots_org_date_unique ON kpi_snapshots (organization_id, snapshot_date);
CREATE INDEX kpi_snapshots_org_idx ON kpi_snapshots (organization_id);

ALTER TABLE kpi_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view kpi_snapshots" ON kpi_snapshots FOR SELECT
  USING (organization_id IN (SELECT organization_id FROM organization_members WHERE user_id = auth.uid()));
CREATE POLICY "Admins can insert kpi_snapshots" ON kpi_snapshots FOR INSERT
  WITH CHECK (organization_id IN (SELECT organization_id FROM organization_members WHERE user_id = auth.uid() AND role = 'admin'));
CREATE POLICY "Admins can update kpi_snapshots" ON kpi_snapshots FOR UPDATE
  USING (organization_id IN (SELECT organization_id FROM organization_members WHERE user_id = auth.uid() AND role = 'admin'));
CREATE POLICY "Admins can delete kpi_snapshots" ON kpi_snapshots FOR DELETE
  USING (organization_id IN (SELECT organization_id FROM organization_members WHERE user_id = auth.uid() AND role = 'admin'));

-- 3. FUNNELS — named conversion funnels
CREATE TABLE funnels (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id      UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name                 TEXT NOT NULL,
  description          TEXT,
  is_dashboard_default BOOLEAN NOT NULL DEFAULT false,
  created_by           UUID NOT NULL REFERENCES auth.users(id),
  updated_by           UUID REFERENCES auth.users(id),
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at           TIMESTAMPTZ
);

CREATE INDEX funnels_org_idx ON funnels (organization_id) WHERE deleted_at IS NULL;

ALTER TABLE funnels ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view funnels" ON funnels FOR SELECT
  USING (organization_id IN (SELECT organization_id FROM organization_members WHERE user_id = auth.uid()));
CREATE POLICY "Admins can insert funnels" ON funnels FOR INSERT
  WITH CHECK (organization_id IN (SELECT organization_id FROM organization_members WHERE user_id = auth.uid() AND role = 'admin'));
CREATE POLICY "Admins can update funnels" ON funnels FOR UPDATE
  USING (organization_id IN (SELECT organization_id FROM organization_members WHERE user_id = auth.uid() AND role = 'admin'));
CREATE POLICY "Admins can delete funnels" ON funnels FOR DELETE
  USING (organization_id IN (SELECT organization_id FROM organization_members WHERE user_id = auth.uid() AND role = 'admin'));

-- 4. FUNNEL STAGES — ordered stages within a funnel, each linked to a KPI
CREATE TABLE funnel_stages (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  funnel_id         UUID NOT NULL REFERENCES funnels(id) ON DELETE CASCADE,
  kpi_definition_id UUID NOT NULL REFERENCES kpi_definitions(id) ON DELETE CASCADE,
  stage_order       INTEGER NOT NULL DEFAULT 0,
  label_override    TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX funnel_stages_funnel_idx ON funnel_stages (funnel_id);

ALTER TABLE funnel_stages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view funnel_stages" ON funnel_stages FOR SELECT
  USING (funnel_id IN (SELECT id FROM funnels WHERE organization_id IN (SELECT organization_id FROM organization_members WHERE user_id = auth.uid())));
CREATE POLICY "Admins can insert funnel_stages" ON funnel_stages FOR INSERT
  WITH CHECK (funnel_id IN (SELECT id FROM funnels WHERE organization_id IN (SELECT organization_id FROM organization_members WHERE user_id = auth.uid() AND role = 'admin')));
CREATE POLICY "Admins can update funnel_stages" ON funnel_stages FOR UPDATE
  USING (funnel_id IN (SELECT id FROM funnels WHERE organization_id IN (SELECT organization_id FROM organization_members WHERE user_id = auth.uid() AND role = 'admin')));
CREATE POLICY "Admins can delete funnel_stages" ON funnel_stages FOR DELETE
  USING (funnel_id IN (SELECT id FROM funnels WHERE organization_id IN (SELECT organization_id FROM organization_members WHERE user_id = auth.uid() AND role = 'admin')));
