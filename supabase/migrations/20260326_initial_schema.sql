-- ============================================================
-- Initial Schema — Company OS
-- ============================================================
-- Tables: organizations, organization_members, projects,
--         project_items, brand_context, content_type_templates,
--         content_types, outputs
-- ============================================================

-- -------------------------------------------------------
-- ORGANIZATIONS
-- -------------------------------------------------------
CREATE TABLE organizations (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name         TEXT NOT NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at   TIMESTAMPTZ
);

ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;

-- Members can read their own org
CREATE POLICY "org_select" ON organizations
  FOR SELECT
  USING (
    id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid()
    )
  );

-- -------------------------------------------------------
-- ORGANIZATION MEMBERS
-- -------------------------------------------------------
CREATE TYPE member_role AS ENUM ('admin', 'member');

CREATE TABLE organization_members (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role            member_role NOT NULL DEFAULT 'member',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (organization_id, user_id)
);

ALTER TABLE organization_members ENABLE ROW LEVEL SECURITY;

-- Members can read membership rows for their own org
CREATE POLICY "org_members_select" ON organization_members
  FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid()
    )
  );

-- Admins can insert new members into their org
CREATE POLICY "org_members_insert_admin" ON organization_members
  FOR INSERT
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- -------------------------------------------------------
-- PROJECTS
-- -------------------------------------------------------
CREATE TABLE projects (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  description     TEXT,
  created_by      UUID NOT NULL REFERENCES auth.users(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at      TIMESTAMPTZ
);

ALTER TABLE projects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "projects_select" ON projects
  FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid()
    )
    AND deleted_at IS NULL
  );

CREATE POLICY "projects_insert" ON projects
  FOR INSERT
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "projects_update_admin" ON projects
  FOR UPDATE
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "projects_delete_admin" ON projects
  FOR DELETE
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

CREATE INDEX idx_projects_organization_id ON projects(organization_id);
CREATE INDEX idx_projects_updated_at ON projects(updated_at DESC);

-- -------------------------------------------------------
-- BRAND CONTEXT
-- One row per organization. Upserted, never duplicated.
-- -------------------------------------------------------
CREATE TABLE brand_context (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id  UUID NOT NULL UNIQUE REFERENCES organizations(id) ON DELETE CASCADE,
  company_name     TEXT NOT NULL,
  mission          TEXT NOT NULL,
  vision           TEXT NOT NULL,
  north_star       TEXT NOT NULL,
  voice            TEXT NOT NULL,
  tone             TEXT NOT NULL,
  pillars          TEXT NOT NULL,
  target_audience  TEXT NOT NULL,
  values           TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE brand_context ENABLE ROW LEVEL SECURITY;

-- All members can read brand context
CREATE POLICY "brand_context_select" ON brand_context
  FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid()
    )
  );

-- Only admins can insert or update brand context
CREATE POLICY "brand_context_insert_admin" ON brand_context
  FOR INSERT
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "brand_context_update_admin" ON brand_context
  FOR UPDATE
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- -------------------------------------------------------
-- CONTENT TYPE TEMPLATES
-- System-level base templates. Read-only for all users.
-- -------------------------------------------------------
CREATE TABLE content_type_templates (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug         TEXT NOT NULL UNIQUE,
  name         TEXT NOT NULL,
  description  TEXT NOT NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE content_type_templates ENABLE ROW LEVEL SECURITY;

-- All authenticated users can read templates
CREATE POLICY "templates_select" ON content_type_templates
  FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- Seed the three base templates
INSERT INTO content_type_templates (slug, name, description) VALUES
  ('social-post',  'Social Post',  'Short-form, single message, hook-driven'),
  ('video-script', 'Video Script', 'Cold open, sections, spoken-word CTA'),
  ('long-form',    'Long Form',    'Headline, intro, body sections, conclusion');

-- -------------------------------------------------------
-- CONTENT TYPES
-- Admin-created types based on base templates.
-- -------------------------------------------------------
CREATE TABLE content_types (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  template_id     UUID NOT NULL REFERENCES content_type_templates(id),
  name            TEXT NOT NULL,
  custom_rules    TEXT NOT NULL,
  is_active       BOOLEAN NOT NULL DEFAULT true,
  created_by      UUID NOT NULL REFERENCES auth.users(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at      TIMESTAMPTZ
);

ALTER TABLE content_types ENABLE ROW LEVEL SECURITY;

-- All members can read active content types for their org
CREATE POLICY "content_types_select" ON content_types
  FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid()
    )
    AND deleted_at IS NULL
  );

-- Only admins can create, update, or delete content types
CREATE POLICY "content_types_insert_admin" ON content_types
  FOR INSERT
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "content_types_update_admin" ON content_types
  FOR UPDATE
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "content_types_delete_admin" ON content_types
  FOR DELETE
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

CREATE INDEX idx_content_types_organization_id ON content_types(organization_id);

-- -------------------------------------------------------
-- OUTPUTS
-- All AI-generated content. Always linked to a project
-- and the content type used to generate it.
-- -------------------------------------------------------
CREATE TABLE outputs (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  project_id      UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  content_type_id UUID NOT NULL REFERENCES content_types(id),
  brief           TEXT NOT NULL,
  content         TEXT NOT NULL,
  created_by      UUID NOT NULL REFERENCES auth.users(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at      TIMESTAMPTZ
);

ALTER TABLE outputs ENABLE ROW LEVEL SECURITY;

-- All members can read outputs for their org
CREATE POLICY "outputs_select" ON outputs
  FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid()
    )
    AND deleted_at IS NULL
  );

-- All members can insert outputs
CREATE POLICY "outputs_insert" ON outputs
  FOR INSERT
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid()
    )
  );

-- All members can update outputs (edit generated content)
CREATE POLICY "outputs_update" ON outputs
  FOR UPDATE
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid()
    )
  );

-- All members can soft-delete outputs
CREATE POLICY "outputs_delete" ON outputs
  FOR DELETE
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid()
    )
  );

CREATE INDEX idx_outputs_project_id ON outputs(project_id);
CREATE INDEX idx_outputs_organization_id ON outputs(organization_id);
CREATE INDEX idx_outputs_created_at ON outputs(created_at DESC);

-- -------------------------------------------------------
-- PROJECT ITEMS (many-to-many)
-- Links any item to one or more projects.
-- Supports future item types beyond outputs.
-- -------------------------------------------------------
CREATE TABLE project_items (
  project_id  UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  item_id     UUID NOT NULL,
  item_type   TEXT NOT NULL CHECK (item_type IN ('output')),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (project_id, item_id, item_type)
);

ALTER TABLE project_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "project_items_select" ON project_items
  FOR SELECT
  USING (
    project_id IN (
      SELECT p.id FROM projects p
      JOIN organization_members om ON om.organization_id = p.organization_id
      WHERE om.user_id = auth.uid()
    )
  );

CREATE POLICY "project_items_insert" ON project_items
  FOR INSERT
  WITH CHECK (
    project_id IN (
      SELECT p.id FROM projects p
      JOIN organization_members om ON om.organization_id = p.organization_id
      WHERE om.user_id = auth.uid()
    )
  );

CREATE POLICY "project_items_delete" ON project_items
  FOR DELETE
  USING (
    project_id IN (
      SELECT p.id FROM projects p
      JOIN organization_members om ON om.organization_id = p.organization_id
      WHERE om.user_id = auth.uid()
    )
  );

-- -------------------------------------------------------
-- UPDATED_AT triggers
-- -------------------------------------------------------
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER organizations_updated_at
  BEFORE UPDATE ON organizations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER projects_updated_at
  BEFORE UPDATE ON projects
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER brand_context_updated_at
  BEFORE UPDATE ON brand_context
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER content_types_updated_at
  BEFORE UPDATE ON content_types
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER outputs_updated_at
  BEFORE UPDATE ON outputs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
