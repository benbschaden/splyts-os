-- Content calendar: scheduled content items with full lifecycle
CREATE TABLE content_calendar (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  title           TEXT NOT NULL,
  description     TEXT,
  scheduled_date  DATE NOT NULL,
  content_type_id UUID REFERENCES content_types(id) ON DELETE SET NULL,
  platform        TEXT,
  author_id       UUID REFERENCES author_profiles(id) ON DELETE SET NULL,
  assigned_to     UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  output_id       UUID REFERENCES outputs(id) ON DELETE SET NULL,
  status          TEXT NOT NULL DEFAULT 'idea'
                  CHECK (status IN ('idea', 'scheduled', 'in_progress', 'generated', 'published', 'cancelled')),
  notes           TEXT,
  created_by      UUID NOT NULL REFERENCES auth.users(id),
  updated_by      UUID REFERENCES auth.users(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at      TIMESTAMPTZ
);

CREATE INDEX content_calendar_org_date_idx
  ON content_calendar (organization_id, scheduled_date) WHERE deleted_at IS NULL;

CREATE INDEX content_calendar_org_status_idx
  ON content_calendar (organization_id, status) WHERE deleted_at IS NULL;

CREATE INDEX content_calendar_output_idx
  ON content_calendar (output_id) WHERE output_id IS NOT NULL;

ALTER TABLE content_calendar ENABLE ROW LEVEL SECURITY;

-- All org members can view calendar items
CREATE POLICY "Org members can view calendar items"
  ON content_calendar FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_members WHERE user_id = auth.uid()
    )
  );

-- All org members can create calendar items
CREATE POLICY "Org members can insert calendar items"
  ON content_calendar FOR INSERT
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM organization_members WHERE user_id = auth.uid()
    )
  );

-- Creators and admins can update calendar items
CREATE POLICY "Creators and admins can update calendar items"
  ON content_calendar FOR UPDATE
  USING (
    created_by = auth.uid()
    OR organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- Creators and admins can delete calendar items
CREATE POLICY "Creators and admins can delete calendar items"
  ON content_calendar FOR DELETE
  USING (
    created_by = auth.uid()
    OR organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );
