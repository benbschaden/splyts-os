-- Add performance tracking columns to outputs
ALTER TABLE outputs
  ADD COLUMN published_at      TIMESTAMPTZ,
  ADD COLUMN reach             INTEGER,
  ADD COLUMN reach_metric      TEXT CHECK (reach_metric IN ('impressions', 'views', 'opens', 'plays', 'other')),
  ADD COLUMN engagement        INTEGER,
  ADD COLUMN performance_notes TEXT;

-- Index for fetching top-performing outputs by reach
CREATE INDEX outputs_org_reach_idx ON outputs (organization_id, reach DESC NULLS LAST)
  WHERE reach IS NOT NULL AND deleted_at IS NULL;
