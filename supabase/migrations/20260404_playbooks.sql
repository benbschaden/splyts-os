-- ============================================================
-- Playbooks
-- ============================================================
-- Team-facing process guides and SOPs. Always visible to all
-- org members (no private/shared concept). Any member can
-- create; only the creator or an admin can edit or delete.
-- ============================================================

CREATE TABLE playbooks (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  created_by      UUID NOT NULL REFERENCES auth.users(id),
  title           TEXT NOT NULL,
  category        TEXT NOT NULL DEFAULT 'General',
  content         TEXT NOT NULL DEFAULT '',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at      TIMESTAMPTZ
);

CREATE INDEX playbooks_org_idx ON playbooks (organization_id)
  WHERE deleted_at IS NULL;

CREATE INDEX playbooks_org_category_idx ON playbooks (organization_id, category)
  WHERE deleted_at IS NULL;

CREATE TRIGGER playbooks_updated_at
  BEFORE UPDATE ON playbooks
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

ALTER TABLE playbooks ENABLE ROW LEVEL SECURITY;

-- All org members can read any playbook (no private visibility)
CREATE POLICY "playbooks_select" ON playbooks
  FOR SELECT
  USING (
    deleted_at IS NULL
    AND organization_id IN (
      SELECT organization_id FROM organization_members WHERE user_id = auth.uid()
    )
  );

-- Any org member can create a playbook
CREATE POLICY "playbooks_insert" ON playbooks
  FOR INSERT
  WITH CHECK (
    created_by = auth.uid()
    AND organization_id IN (
      SELECT organization_id FROM organization_members WHERE user_id = auth.uid()
    )
  );

-- Only the creator can update their own playbooks
CREATE POLICY "playbooks_update" ON playbooks
  FOR UPDATE
  USING (created_by = auth.uid() AND deleted_at IS NULL);

-- Only the creator can soft-delete their own playbooks
CREATE POLICY "playbooks_delete" ON playbooks
  FOR DELETE
  USING (created_by = auth.uid());
