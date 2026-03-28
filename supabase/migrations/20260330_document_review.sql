-- Document review controls
-- Phase 1: admin-only filing gate
-- Phase 2: team reviewer support

-- Add reviewer role on team memberships
ALTER TABLE team_members
  ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'member';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.table_constraints
    WHERE table_schema = 'public'
      AND table_name = 'team_members'
      AND constraint_name = 'team_members_role_check'
  ) THEN
    ALTER TABLE team_members
      ADD CONSTRAINT team_members_role_check
      CHECK (role IN ('member', 'reviewer'));
  END IF;
END $$;

-- Add document review request tracking + optional team assignment
ALTER TABLE documents
  ADD COLUMN IF NOT EXISTS review_requested_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS review_requested_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS team_id UUID REFERENCES teams(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS documents_review_requested_idx
  ON documents (organization_id, review_requested_at DESC)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS documents_team_id_idx
  ON documents (team_id)
  WHERE deleted_at IS NULL;
