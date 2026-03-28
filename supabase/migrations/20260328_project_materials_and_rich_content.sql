-- ============================================================
-- Project Materials, Output Attachments, Rich Content Support
-- ============================================================
-- Extends projects into knowledge workspaces with materials
-- (notes, files, links), output attachments, project-scoped
-- chat, visibility/tags, archive status, and new content
-- type templates for long-form content.
-- ============================================================

-- -------------------------------------------------------
-- 1. project_materials — notes, files, and links per project
-- -------------------------------------------------------

CREATE TABLE project_materials (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id      UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  created_by      UUID NOT NULL REFERENCES auth.users(id),
  material_type   TEXT NOT NULL CHECK (material_type IN ('note', 'file', 'link')),
  title           TEXT,
  content         TEXT,
  file_url        TEXT,
  file_name       TEXT,
  file_mime       TEXT,
  link_url        TEXT,
  sort_order      INTEGER NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at      TIMESTAMPTZ
);

CREATE INDEX project_materials_project_idx
  ON project_materials (project_id) WHERE deleted_at IS NULL;

CREATE INDEX project_materials_org_idx
  ON project_materials (organization_id) WHERE deleted_at IS NULL;

CREATE TRIGGER project_materials_updated_at
  BEFORE UPDATE ON project_materials
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

ALTER TABLE project_materials ENABLE ROW LEVEL SECURITY;

CREATE POLICY "project_materials_select" ON project_materials
  FOR SELECT
  USING (
    deleted_at IS NULL
    AND organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "project_materials_insert" ON project_materials
  FOR INSERT
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "project_materials_update" ON project_materials
  FOR UPDATE
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "project_materials_delete" ON project_materials
  FOR DELETE
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid()
    )
  );

-- -------------------------------------------------------
-- 2. output_attachments — files linked to outputs
-- -------------------------------------------------------

CREATE TABLE output_attachments (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  output_id  UUID NOT NULL REFERENCES outputs(id) ON DELETE CASCADE,
  file_url   TEXT NOT NULL,
  file_name  TEXT NOT NULL,
  file_mime  TEXT NOT NULL,
  caption    TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX output_attachments_output_idx ON output_attachments (output_id);

ALTER TABLE output_attachments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "output_attachments_select" ON output_attachments
  FOR SELECT
  USING (
    output_id IN (
      SELECT o.id FROM outputs o
      JOIN organization_members om ON om.organization_id = o.organization_id
      WHERE om.user_id = auth.uid()
        AND o.deleted_at IS NULL
    )
  );

CREATE POLICY "output_attachments_insert" ON output_attachments
  FOR INSERT
  WITH CHECK (
    output_id IN (
      SELECT o.id FROM outputs o
      JOIN organization_members om ON om.organization_id = o.organization_id
      WHERE om.user_id = auth.uid()
    )
  );

CREATE POLICY "output_attachments_delete" ON output_attachments
  FOR DELETE
  USING (
    output_id IN (
      SELECT o.id FROM outputs o
      JOIN organization_members om ON om.organization_id = o.organization_id
      WHERE om.user_id = auth.uid()
    )
  );

-- -------------------------------------------------------
-- 3. outputs — add metadata JSONB
-- -------------------------------------------------------

ALTER TABLE outputs ADD COLUMN IF NOT EXISTS metadata JSONB;

-- -------------------------------------------------------
-- 4. projects — tags, visibility, status
-- -------------------------------------------------------

ALTER TABLE projects ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}';
ALTER TABLE projects ADD COLUMN IF NOT EXISTS visibility TEXT NOT NULL DEFAULT 'shared'
  CHECK (visibility IN ('private', 'shared'));
ALTER TABLE projects ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'active'
  CHECK (status IN ('active', 'archived'));

CREATE INDEX projects_tags_idx ON projects USING GIN (tags) WHERE deleted_at IS NULL;
CREATE INDEX projects_visibility_idx ON projects (organization_id, visibility) WHERE deleted_at IS NULL;
CREATE INDEX projects_status_idx ON projects (organization_id, status) WHERE deleted_at IS NULL;

-- Backfill existing projects as shared + active
UPDATE projects SET visibility = 'shared', status = 'active'
WHERE visibility IS NULL OR status IS NULL;

-- Update seed table too
ALTER TABLE org_project_seeds ADD COLUMN IF NOT EXISTS visibility TEXT DEFAULT 'shared';
UPDATE org_project_seeds SET visibility = 'shared' WHERE visibility IS NULL;

-- Replace existing projects RLS policies with visibility-aware versions
DROP POLICY IF EXISTS "projects_select" ON projects;

CREATE POLICY "projects_select" ON projects
  FOR SELECT
  USING (
    deleted_at IS NULL
    AND (
      -- Shared projects: any org member can see
      (
        visibility = 'shared'
        AND organization_id IN (
          SELECT organization_id FROM organization_members
          WHERE user_id = auth.uid()
        )
      )
      -- Private projects: only the creator can see
      OR (
        visibility = 'private'
        AND created_by = auth.uid()
        AND organization_id IN (
          SELECT organization_id FROM organization_members
          WHERE user_id = auth.uid()
        )
      )
    )
  );

-- -------------------------------------------------------
-- 5. chat_sessions — optional project_id
-- -------------------------------------------------------

ALTER TABLE chat_sessions ADD COLUMN IF NOT EXISTS project_id UUID REFERENCES projects(id) ON DELETE SET NULL;

CREATE INDEX chat_sessions_project_idx ON chat_sessions (project_id) WHERE project_id IS NOT NULL AND deleted_at IS NULL;

-- -------------------------------------------------------
-- 6. New content type templates
-- -------------------------------------------------------

INSERT INTO content_type_templates (slug, name, description, base_prompt) VALUES
  (
    'blog-post',
    'Blog Post',
    'Structured blog post with headline, sections, and takeaway',
    'Write a blog post. Structure: a compelling headline, an opening paragraph that hooks the reader, 3–5 body sections each with a clear subheading, and a conclusion with a strong takeaway or call to action. Support claims with data and references from research materials when provided. Use subheadings (##) to separate sections. Write in a clear, engaging, authoritative style.'
  ),
  (
    'journal-article',
    'Journal Article',
    'Research-style article with abstract, methods, findings, and discussion',
    'Write a journal-style article. Structure: abstract (2–3 sentences summarising the piece), introduction (context and thesis), methods or approach section, findings and analysis (reference data, figures, and research materials when provided), discussion of implications, and a brief conclusion. Use subheadings (##) for each section. Write in a precise, evidence-based, authoritative style. Cite specific data points from the research materials.'
  )
ON CONFLICT (slug) DO NOTHING;

-- -------------------------------------------------------
-- 7. Supabase Storage bucket — project-files (private)
-- -------------------------------------------------------

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'project-files',
  'project-files',
  false,
  52428800,
  ARRAY[
    'image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml',
    'application/pdf',
    'text/csv', 'text/plain',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/json'
  ]
)
ON CONFLICT (id) DO NOTHING;

-- Storage RLS: org members can upload/read/delete within their org path
CREATE POLICY "project_files_insert" ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'project-files'
    AND auth.uid() IS NOT NULL
  );

CREATE POLICY "project_files_select" ON storage.objects
  FOR SELECT
  USING (
    bucket_id = 'project-files'
    AND auth.uid() IS NOT NULL
  );

CREATE POLICY "project_files_update" ON storage.objects
  FOR UPDATE
  USING (
    bucket_id = 'project-files'
    AND auth.uid() IS NOT NULL
  );

CREATE POLICY "project_files_delete" ON storage.objects
  FOR DELETE
  USING (
    bucket_id = 'project-files'
    AND auth.uid() IS NOT NULL
  );
