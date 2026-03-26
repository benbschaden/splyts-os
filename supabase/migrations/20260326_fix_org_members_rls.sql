-- ============================================================
-- Fix: organization_members RLS policy was self-referencing
-- ============================================================
-- The original policy checked membership by querying
-- organization_members from within an organization_members policy,
-- which creates a circular reference that always returns no rows.
-- Fixed by using user_id = auth.uid() directly.
-- ============================================================

DROP POLICY IF EXISTS "org_members_select" ON organization_members;

-- Simple, non-circular: you can read your own membership row(s)
CREATE POLICY "org_members_select" ON organization_members
  FOR SELECT
  USING (user_id = auth.uid());
