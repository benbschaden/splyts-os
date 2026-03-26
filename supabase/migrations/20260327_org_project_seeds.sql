-- ============================================================
-- Org Project Seeds
-- ============================================================
-- Defines which projects are automatically created for every
-- new organisation at setup time. Details live in this table,
-- not in application code. Add or deactivate rows here to
-- control what new orgs receive.
-- ============================================================

CREATE TABLE org_project_seeds (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL,
  description TEXT,
  is_active   BOOLEAN NOT NULL DEFAULT true,
  sort_order  INTEGER NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Any authenticated user can read seeds (needed at org creation time)
ALTER TABLE org_project_seeds ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org_project_seeds_select" ON org_project_seeds
  FOR SELECT
  USING (true);

-- Seed data — the default project every new org receives
INSERT INTO org_project_seeds (name, description, sort_order) VALUES (
  'Marketing Content',
  'Default project for generating and managing marketing content across platforms.',
  0
);
