CREATE TABLE content_benchmarks (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  platform        TEXT NOT NULL,
  metric_name     TEXT NOT NULL,
  benchmark_value NUMERIC NOT NULL,
  benchmark_unit  TEXT NOT NULL DEFAULT 'count',
  notes           TEXT,
  created_by      UUID NOT NULL REFERENCES auth.users(id),
  updated_by      UUID REFERENCES auth.users(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at      TIMESTAMPTZ
);

CREATE INDEX content_benchmarks_org_idx ON content_benchmarks (organization_id) WHERE deleted_at IS NULL;

CREATE UNIQUE INDEX content_benchmarks_org_platform_metric_unique
  ON content_benchmarks (organization_id, platform, metric_name)
  WHERE deleted_at IS NULL;

ALTER TABLE content_benchmarks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view content_benchmarks" ON content_benchmarks FOR SELECT
  USING (organization_id IN (SELECT organization_id FROM organization_members WHERE user_id = auth.uid()));

CREATE POLICY "Admins can insert content_benchmarks" ON content_benchmarks FOR INSERT
  WITH CHECK (organization_id IN (SELECT organization_id FROM organization_members WHERE user_id = auth.uid() AND role = 'admin'));

CREATE POLICY "Admins can update content_benchmarks" ON content_benchmarks FOR UPDATE
  USING (organization_id IN (SELECT organization_id FROM organization_members WHERE user_id = auth.uid() AND role = 'admin'));

CREATE POLICY "Admins can delete content_benchmarks" ON content_benchmarks FOR DELETE
  USING (organization_id IN (SELECT organization_id FROM organization_members WHERE user_id = auth.uid() AND role = 'admin'));
