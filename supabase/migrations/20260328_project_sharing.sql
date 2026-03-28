-- ================================================================
-- Project Sharing: teams, project_teams, project_members, org_team_seeds
-- ================================================================
-- Changes:
-- 1. projects.visibility — drop old constraint, rename 'shared'→'organization',
--    add new 4-value constraint, update default
-- 2. CREATE TABLE teams (org-level teams)
-- 3. CREATE TABLE team_members (who is in each team)
-- 4. CREATE TABLE project_teams (which teams can see a project)
-- 5. CREATE TABLE project_members (which specific users can see a project)
-- 6. CREATE TABLE org_team_seeds (default teams seeded at org creation)
-- 7. Seed B2C SaaS default teams into org_team_seeds
-- 8. RLS: enable + policies for all new tables
-- 9. RLS: rewrite projects_select (4-branch visibility) and projects_update
--         (creator OR admin can update, was admin-only)
-- 10. Update org_project_seeds.visibility default to 'organization'
-- ================================================================

-- -------------------------------------------------------
-- 1. projects.visibility — update constraint and values
-- -------------------------------------------------------

-- Drop any existing check constraint on the visibility column (name may vary)
DO $$
DECLARE
  v_constraint_name TEXT;
BEGIN
  SELECT tc.constraint_name INTO v_constraint_name
  FROM information_schema.table_constraints tc
  JOIN information_schema.check_constraints cc
    ON tc.constraint_name = cc.constraint_name
       AND tc.table_schema = cc.constraint_schema
  WHERE tc.table_name = 'projects'
    AND tc.table_schema = 'public'
    AND tc.constraint_type = 'CHECK'
    AND cc.check_clause LIKE '%visibility%';

  IF v_constraint_name IS NOT NULL THEN
    EXECUTE format('ALTER TABLE projects DROP CONSTRAINT %I', v_constraint_name);
  END IF;
END;
$$;

-- Rename existing 'shared' rows to 'organization'
UPDATE projects SET visibility = 'organization' WHERE visibility = 'shared';

-- Update default for new rows
ALTER TABLE projects ALTER COLUMN visibility SET DEFAULT 'organization';

-- Add new constraint with all 4 values
ALTER TABLE projects
  ADD CONSTRAINT projects_visibility_check
  CHECK (visibility IN ('private', 'organization', 'team', 'specific_users'));

-- Update org_project_seeds visibility column default
UPDATE org_project_seeds SET visibility = 'organization' WHERE visibility = 'shared' OR visibility IS NULL;
ALTER TABLE org_project_seeds ALTER COLUMN visibility SET DEFAULT 'organization';

-- Also drop old visibility index and recreate (it may need rebuilding after value changes)
DROP INDEX IF EXISTS projects_visibility_idx;
CREATE INDEX projects_visibility_idx ON projects (organization_id, visibility) WHERE deleted_at IS NULL;

-- -------------------------------------------------------
-- 2. teams table
-- -------------------------------------------------------

CREATE TABLE teams (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  created_by      UUID NOT NULL REFERENCES auth.users(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at      TIMESTAMPTZ,
  UNIQUE (organization_id, name)
);

CREATE INDEX teams_org_idx ON teams (organization_id) WHERE deleted_at IS NULL;

-- -------------------------------------------------------
-- 3. team_members table
-- -------------------------------------------------------

CREATE TABLE team_members (
  team_id  UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  user_id  UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  added_by UUID NOT NULL REFERENCES auth.users(id),
  added_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (team_id, user_id)
);

CREATE INDEX team_members_user_idx ON team_members (user_id);

-- -------------------------------------------------------
-- 4. project_teams table (which teams can see a project)
-- -------------------------------------------------------

CREATE TABLE project_teams (
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  team_id    UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  PRIMARY KEY (project_id, team_id)
);

CREATE INDEX project_teams_team_idx ON project_teams (team_id);

-- -------------------------------------------------------
-- 5. project_members table (specific users who can see a project)
-- -------------------------------------------------------

CREATE TABLE project_members (
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  granted_by UUID NOT NULL REFERENCES auth.users(id),
  granted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (project_id, user_id)
);

CREATE INDEX project_members_user_idx ON project_members (user_id);

-- -------------------------------------------------------
-- 6. org_team_seeds table
-- -------------------------------------------------------

CREATE TABLE org_team_seeds (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name       TEXT NOT NULL UNIQUE,
  sort_order INT NOT NULL DEFAULT 0,
  is_active  BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE org_team_seeds ENABLE ROW LEVEL SECURITY;

-- Any authenticated user can read seeds (needed at org creation time)
CREATE POLICY "org_team_seeds_select" ON org_team_seeds
  FOR SELECT USING (true);

-- -------------------------------------------------------
-- 7. Seed default B2C SaaS teams
-- -------------------------------------------------------

INSERT INTO org_team_seeds (name, sort_order) VALUES
  ('Product',           1),
  ('Engineering',       2),
  ('Design',            3),
  ('Growth',            4),
  ('Marketing',         5),
  ('Customer Success',  6),
  ('Data & Analytics',  7),
  ('Operations',        8),
  ('Finance',           9),
  ('People',           10);

-- -------------------------------------------------------
-- 8. RLS for new tables
-- -------------------------------------------------------

ALTER TABLE teams         ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_members  ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_members ENABLE ROW LEVEL SECURITY;

-- teams: any org member can read their org's active teams
CREATE POLICY "teams_select" ON teams
  FOR SELECT
  USING (
    deleted_at IS NULL
    AND organization_id IN (
      SELECT organization_id FROM organization_members WHERE user_id = auth.uid()
    )
  );

-- admins can create teams
CREATE POLICY "teams_insert_admin" ON teams
  FOR INSERT
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- admins can update teams (rename, soft-delete)
CREATE POLICY "teams_update_admin" ON teams
  FOR UPDATE
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- team_members: any org member can read team membership (needed for picker and project access)
CREATE POLICY "team_members_select" ON team_members
  FOR SELECT
  USING (
    team_id IN (
      SELECT t.id FROM teams t
      JOIN organization_members om ON om.organization_id = t.organization_id
      WHERE om.user_id = auth.uid() AND t.deleted_at IS NULL
    )
  );

-- admins can manage team membership
CREATE POLICY "team_members_insert_admin" ON team_members
  FOR INSERT
  WITH CHECK (
    team_id IN (
      SELECT t.id FROM teams t
      JOIN organization_members om ON om.organization_id = t.organization_id
      WHERE om.user_id = auth.uid() AND om.role = 'admin' AND t.deleted_at IS NULL
    )
  );

CREATE POLICY "team_members_delete_admin" ON team_members
  FOR DELETE
  USING (
    team_id IN (
      SELECT t.id FROM teams t
      JOIN organization_members om ON om.organization_id = t.organization_id
      WHERE om.user_id = auth.uid() AND om.role = 'admin' AND t.deleted_at IS NULL
    )
  );

-- project_teams: org members can read team assignments for projects in their org
CREATE POLICY "project_teams_select" ON project_teams
  FOR SELECT
  USING (
    project_id IN (
      SELECT p.id FROM projects p
      JOIN organization_members om ON om.organization_id = p.organization_id
      WHERE om.user_id = auth.uid() AND p.deleted_at IS NULL
    )
  );

-- project creator or admin can insert project_teams rows
CREATE POLICY "project_teams_insert" ON project_teams
  FOR INSERT
  WITH CHECK (
    project_id IN (
      SELECT p.id FROM projects p
      JOIN organization_members om ON om.organization_id = p.organization_id
      WHERE om.user_id = auth.uid()
        AND p.deleted_at IS NULL
        AND (p.created_by = auth.uid() OR om.role = 'admin')
    )
  );

-- project creator or admin can delete project_teams rows
CREATE POLICY "project_teams_delete" ON project_teams
  FOR DELETE
  USING (
    project_id IN (
      SELECT p.id FROM projects p
      JOIN organization_members om ON om.organization_id = p.organization_id
      WHERE om.user_id = auth.uid()
        AND p.deleted_at IS NULL
        AND (p.created_by = auth.uid() OR om.role = 'admin')
    )
  );

-- project_members: org members can read user assignments for projects in their org
CREATE POLICY "project_members_select" ON project_members
  FOR SELECT
  USING (
    project_id IN (
      SELECT p.id FROM projects p
      JOIN organization_members om ON om.organization_id = p.organization_id
      WHERE om.user_id = auth.uid() AND p.deleted_at IS NULL
    )
  );

-- project creator or admin can insert project_members rows
CREATE POLICY "project_members_insert" ON project_members
  FOR INSERT
  WITH CHECK (
    project_id IN (
      SELECT p.id FROM projects p
      JOIN organization_members om ON om.organization_id = p.organization_id
      WHERE om.user_id = auth.uid()
        AND p.deleted_at IS NULL
        AND (p.created_by = auth.uid() OR om.role = 'admin')
    )
  );

-- project creator or admin can delete project_members rows
CREATE POLICY "project_members_delete" ON project_members
  FOR DELETE
  USING (
    project_id IN (
      SELECT p.id FROM projects p
      JOIN organization_members om ON om.organization_id = p.organization_id
      WHERE om.user_id = auth.uid()
        AND p.deleted_at IS NULL
        AND (p.created_by = auth.uid() OR om.role = 'admin')
    )
  );

-- -------------------------------------------------------
-- 9. Rewrite projects RLS policies
-- -------------------------------------------------------

-- projects_select: was already rewritten in project_materials_and_rich_content migration.
-- Drop and recreate with 4-branch visibility logic.
DROP POLICY IF EXISTS "projects_select" ON projects;

CREATE POLICY "projects_select" ON projects
  FOR SELECT
  USING (
    deleted_at IS NULL
    AND organization_id IN (
      SELECT organization_id FROM organization_members WHERE user_id = auth.uid()
    )
    AND (
      -- Whole company: any org member sees it
      visibility = 'organization'

      -- Private: only the creator
      OR (visibility = 'private' AND created_by = auth.uid())

      -- Team: creator always has access; other members need to be in a granted team
      OR (
        visibility = 'team'
        AND (
          created_by = auth.uid()
          OR id IN (
            SELECT pt.project_id FROM project_teams pt
            JOIN team_members tm ON tm.team_id = pt.team_id
            WHERE tm.user_id = auth.uid()
          )
        )
      )

      -- Specific users: creator always has access; otherwise must be in project_members
      OR (
        visibility = 'specific_users'
        AND (
          created_by = auth.uid()
          OR id IN (
            SELECT project_id FROM project_members WHERE user_id = auth.uid()
          )
        )
      )
    )
  );

-- projects_update: was admin-only. Now creator OR admin can update.
DROP POLICY IF EXISTS "projects_update_admin" ON projects;

CREATE POLICY "projects_update" ON projects
  FOR UPDATE
  USING (
    deleted_at IS NULL
    AND organization_id IN (
      SELECT organization_id FROM organization_members WHERE user_id = auth.uid()
    )
    AND (
      created_by = auth.uid()
      OR organization_id IN (
        SELECT organization_id FROM organization_members
        WHERE user_id = auth.uid() AND role = 'admin'
      )
    )
  );
