-- Migration: Company Knowledge — org-scoped file uploads for AI field population
-- Isolated from all generate/chat endpoints. Never queried outside company/suggest routes.

-- 1. Storage bucket (private, 50MB limit)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'company-knowledge',
  'company-knowledge',
  false,
  52428800,
  ARRAY[
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/plain',
    'text/markdown'
  ]
)
ON CONFLICT (id) DO NOTHING;

-- Storage RLS: org members can read/write only their org's files
CREATE POLICY "company_knowledge_storage_select"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'company-knowledge'
    AND (storage.foldername(name))[1] IN (
      SELECT organization_id::text FROM organization_members
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "company_knowledge_storage_insert"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'company-knowledge'
    AND (storage.foldername(name))[1] IN (
      SELECT organization_id::text FROM organization_members
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "company_knowledge_storage_delete"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'company-knowledge'
    AND (storage.foldername(name))[1] IN (
      SELECT organization_id::text FROM organization_members
      WHERE user_id = auth.uid()
    )
  );

-- 2. company_knowledge_files
CREATE TABLE company_knowledge_files (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id   UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  created_by        UUID NOT NULL REFERENCES auth.users(id),
  file_name         TEXT NOT NULL,
  file_url          TEXT NOT NULL,
  file_mime         TEXT NOT NULL,
  file_size_bytes   BIGINT,
  processed_text    TEXT,
  processing_status TEXT NOT NULL DEFAULT 'pending'
                    CHECK (processing_status IN ('pending', 'processing', 'ready', 'failed')),
  processing_error  TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at        TIMESTAMPTZ
);

CREATE INDEX company_knowledge_files_org_idx
  ON company_knowledge_files (organization_id)
  WHERE deleted_at IS NULL;

CREATE TRIGGER company_knowledge_files_updated_at
  BEFORE UPDATE ON company_knowledge_files
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

ALTER TABLE company_knowledge_files ENABLE ROW LEVEL SECURITY;

CREATE POLICY "company_knowledge_files_select"
  ON company_knowledge_files FOR SELECT
  USING (
    deleted_at IS NULL
    AND organization_id IN (
      SELECT organization_id FROM organization_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "company_knowledge_files_insert"
  ON company_knowledge_files FOR INSERT
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM organization_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "company_knowledge_files_update"
  ON company_knowledge_files FOR UPDATE
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "company_knowledge_files_delete"
  ON company_knowledge_files FOR DELETE
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_members WHERE user_id = auth.uid()
    )
  );

-- 3. company_knowledge_conflicts
CREATE TABLE company_knowledge_conflicts (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  file_id_a       UUID NOT NULL REFERENCES company_knowledge_files(id) ON DELETE CASCADE,
  file_id_b       UUID NOT NULL REFERENCES company_knowledge_files(id) ON DELETE CASCADE,
  topic           TEXT NOT NULL,
  description     TEXT NOT NULL,
  excerpt_a       TEXT,
  excerpt_b       TEXT,
  dismissed_at    TIMESTAMPTZ,
  dismissed_by    UUID REFERENCES auth.users(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX company_knowledge_conflicts_org_idx
  ON company_knowledge_conflicts (organization_id);

CREATE INDEX company_knowledge_conflicts_files_idx
  ON company_knowledge_conflicts (file_id_a, file_id_b);

ALTER TABLE company_knowledge_conflicts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "company_knowledge_conflicts_select"
  ON company_knowledge_conflicts FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "company_knowledge_conflicts_insert"
  ON company_knowledge_conflicts FOR INSERT
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM organization_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "company_knowledge_conflicts_update"
  ON company_knowledge_conflicts FOR UPDATE
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_members WHERE user_id = auth.uid()
    )
  );
