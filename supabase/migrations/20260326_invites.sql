-- ============================================================
-- Migration: invites table
-- Stores pending team member invites per organisation.
-- ============================================================

CREATE TABLE invites (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  email           TEXT NOT NULL,
  role            TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('admin', 'member')),
  token           UUID NOT NULL DEFAULT gen_random_uuid() UNIQUE,
  invited_by      UUID NOT NULL REFERENCES auth.users(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at      TIMESTAMPTZ NOT NULL DEFAULT now() + INTERVAL '7 days',
  accepted_at     TIMESTAMPTZ
);

CREATE INDEX invites_token_idx ON invites (token);
CREATE INDEX invites_email_idx ON invites (email);
CREATE INDEX invites_org_idx ON invites (organization_id);

ALTER TABLE invites ENABLE ROW LEVEL SECURITY;

-- Admins of the org can view and manage invites for their org
CREATE POLICY "invites_admin_all" ON invites
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM organization_members
      WHERE organization_members.organization_id = invites.organization_id
        AND organization_members.user_id = auth.uid()
        AND organization_members.role = 'admin'
    )
  );
