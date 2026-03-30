-- Risk Register
-- Standalone risk matrix tool. One row per identified risk.
-- likelihood and impact are integers 1–5; priority_score = likelihood * impact (computed).

CREATE TABLE risks (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id  UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

  title            TEXT NOT NULL,
  description      TEXT,

  -- taxonomy
  category         TEXT NOT NULL DEFAULT 'operational',
  -- suggested values: strategic, operational, financial, legal, reputational, technical

  -- scoring (1 = very low, 5 = very high)
  likelihood       SMALLINT NOT NULL DEFAULT 3 CHECK (likelihood BETWEEN 1 AND 5),
  impact           SMALLINT NOT NULL DEFAULT 3 CHECK (impact BETWEEN 1 AND 5),

  -- derived but stored so it can be sorted/filtered efficiently
  priority_score   SMALLINT GENERATED ALWAYS AS (likelihood * impact) STORED,

  owner            TEXT,         -- free-text name of the person / team owning this risk
  mitigation       TEXT,         -- current mitigation approach

  -- lifecycle
  status           TEXT NOT NULL DEFAULT 'open'
                   CHECK (status IN ('open', 'monitoring', 'mitigated', 'closed')),
  last_reviewed_at TIMESTAMPTZ,

  -- audit
  created_by       UUID NOT NULL REFERENCES auth.users(id),
  updated_by       UUID REFERENCES auth.users(id),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at       TIMESTAMPTZ
);

ALTER TABLE risks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org members see their risks"
  ON risks FOR ALL
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid()
    )
  );

CREATE INDEX risks_org_status_idx ON risks (organization_id, status)
  WHERE deleted_at IS NULL;
