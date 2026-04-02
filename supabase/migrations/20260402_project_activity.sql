-- Project activity feed: records notable actions taken by users within a project.
CREATE TABLE project_activity (
  id              UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID         NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  project_id      UUID         NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  actor_user_id   UUID         NOT NULL,
  action_type     TEXT         NOT NULL,
  -- action_type values: output_generated, file_uploaded, note_added, link_added,
  --                     discussion_started, discussion_resolved
  entity_name     TEXT,
  created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_project_activity_org_created ON project_activity (organization_id, created_at DESC);
CREATE INDEX idx_project_activity_project ON project_activity (project_id, created_at DESC);

ALTER TABLE project_activity ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members see their org's project activity"
  ON project_activity FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_members WHERE user_id = auth.uid()
    )
  );

-- Only the service role inserts (via API routes); no direct user INSERT allowed.
CREATE POLICY "Service role inserts activity"
  ON project_activity FOR INSERT
  WITH CHECK (false);

-- Track when each user last opened their notifications panel
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS notifications_last_read_at TIMESTAMPTZ;
