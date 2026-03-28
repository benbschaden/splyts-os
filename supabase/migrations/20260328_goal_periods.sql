-- ============================================================
-- Goal Periods & Period Goals
-- ============================================================
-- Replaces the single-row current_goals table with a proper
-- quarterly goal-tracking system. Each quarter is a row in
-- goal_periods; individual trackable goals live in period_goals.
-- ============================================================

-- ---------- goal_periods ----------
CREATE TABLE goal_periods (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  period_label    TEXT NOT NULL,
  period_start    DATE NOT NULL,
  period_end      DATE NOT NULL,
  status          TEXT NOT NULL DEFAULT 'active'
                  CHECK (status IN ('active', 'reviewing', 'closed')),
  focus_areas     TEXT,
  what_to_push    TEXT,
  what_to_defer   TEXT,
  review_summary  TEXT,
  reviewed_at     TIMESTAMPTZ,
  reviewed_by     UUID REFERENCES auth.users(id),
  created_by      UUID NOT NULL REFERENCES auth.users(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX goal_periods_org_idx ON goal_periods (organization_id);
CREATE INDEX goal_periods_org_status_idx ON goal_periods (organization_id, status);

CREATE UNIQUE INDEX one_active_period_per_org
  ON goal_periods (organization_id) WHERE status = 'active';

CREATE TRIGGER goal_periods_updated_at
  BEFORE UPDATE ON goal_periods
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- RLS
ALTER TABLE goal_periods ENABLE ROW LEVEL SECURITY;

CREATE POLICY "goal_periods_select" ON goal_periods FOR SELECT
  USING (organization_id IN (
    SELECT organization_id FROM organization_members WHERE user_id = auth.uid()
  ));

CREATE POLICY "goal_periods_insert" ON goal_periods FOR INSERT
  WITH CHECK (organization_id IN (
    SELECT organization_id FROM organization_members
    WHERE user_id = auth.uid() AND role = 'admin'
  ));

CREATE POLICY "goal_periods_update" ON goal_periods FOR UPDATE
  USING (organization_id IN (
    SELECT organization_id FROM organization_members
    WHERE user_id = auth.uid() AND role = 'admin'
  ));

-- ---------- period_goals ----------
CREATE TABLE period_goals (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  goal_period_id        UUID NOT NULL REFERENCES goal_periods(id) ON DELETE CASCADE,
  organization_id       UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  title                 TEXT NOT NULL,
  description           TEXT,
  sort_order            INTEGER NOT NULL DEFAULT 0,
  outcome               TEXT CHECK (outcome IS NULL OR outcome IN ('achieved', 'partial', 'missed')),
  outcome_notes         TEXT,
  carried_from_goal_id  UUID REFERENCES period_goals(id) ON DELETE SET NULL,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX period_goals_period_idx ON period_goals (goal_period_id);
CREATE INDEX period_goals_org_idx ON period_goals (organization_id);

CREATE TRIGGER period_goals_updated_at
  BEFORE UPDATE ON period_goals
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- RLS
ALTER TABLE period_goals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "period_goals_select" ON period_goals FOR SELECT
  USING (organization_id IN (
    SELECT organization_id FROM organization_members WHERE user_id = auth.uid()
  ));

CREATE POLICY "period_goals_insert" ON period_goals FOR INSERT
  WITH CHECK (organization_id IN (
    SELECT organization_id FROM organization_members
    WHERE user_id = auth.uid() AND role = 'admin'
  ));

CREATE POLICY "period_goals_update" ON period_goals FOR UPDATE
  USING (organization_id IN (
    SELECT organization_id FROM organization_members
    WHERE user_id = auth.uid() AND role = 'admin'
  ));

CREATE POLICY "period_goals_delete" ON period_goals FOR DELETE
  USING (organization_id IN (
    SELECT organization_id FROM organization_members
    WHERE user_id = auth.uid() AND role = 'admin'
  ));

-- ---------- Backfill from current_goals ----------
-- Migrate existing data into goal_periods. The old table stored
-- free-text key_results which we cannot split into individual
-- goals automatically, so we store it as a single goal.

INSERT INTO goal_periods (
  organization_id, period_label, period_start, period_end,
  status, focus_areas, what_to_push, what_to_defer,
  created_by, created_at, updated_at
)
SELECT
  cg.organization_id,
  COALESCE(NULLIF(TRIM(cg.sections->>'period_label'), ''), 'Q1 2026'),
  COALESCE(
    (cg.sections->>'period_start')::date,
    date_trunc('quarter', cg.created_at)::date
  ),
  COALESCE(
    (cg.sections->>'period_end')::date,
    (date_trunc('quarter', cg.created_at) + INTERVAL '3 months' - INTERVAL '1 day')::date
  ),
  'active',
  NULLIF(TRIM(cg.sections->>'focus_areas'), ''),
  NULLIF(TRIM(cg.sections->>'what_to_push'), ''),
  NULLIF(TRIM(cg.sections->>'what_to_defer'), ''),
  COALESCE(cg.updated_by, (SELECT user_id FROM organization_members WHERE organization_id = cg.organization_id LIMIT 1)),
  cg.created_at,
  cg.updated_at
FROM current_goals cg;

-- Migrate key_results text into a single period_goal per backfilled period
INSERT INTO period_goals (goal_period_id, organization_id, title, description, sort_order)
SELECT
  gp.id,
  gp.organization_id,
  'Key results (migrated)',
  NULLIF(TRIM(cg.sections->>'key_results'), ''),
  0
FROM goal_periods gp
JOIN current_goals cg ON cg.organization_id = gp.organization_id
WHERE NULLIF(TRIM(cg.sections->>'key_results'), '') IS NOT NULL;

-- ---------- Drop old table ----------
DROP TABLE current_goals;
