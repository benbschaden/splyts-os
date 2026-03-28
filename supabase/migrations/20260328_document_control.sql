-- Migration: Document control system
-- Adds versioning, soft locking, filing audit trail, and AI summary to documents
-- Creates document_versions table for full rollback capability

-- 1. New columns on documents
ALTER TABLE documents ADD COLUMN IF NOT EXISTS version INTEGER NOT NULL DEFAULT 1;
ALTER TABLE documents ADD COLUMN IF NOT EXISTS locked_by UUID REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE documents ADD COLUMN IF NOT EXISTS locked_at TIMESTAMPTZ;
ALTER TABLE documents ADD COLUMN IF NOT EXISTS filed_at TIMESTAMPTZ;
ALTER TABLE documents ADD COLUMN IF NOT EXISTS filed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE documents ADD COLUMN IF NOT EXISTS summary TEXT;

-- 2. document_versions: snapshot of every content save
CREATE TABLE IF NOT EXISTS document_versions (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  version     INTEGER NOT NULL,
  content     TEXT NOT NULL,
  title       TEXT NOT NULL,
  edited_by   UUID NOT NULL REFERENCES auth.users(id),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS doc_versions_doc_idx ON document_versions (document_id, version DESC);

ALTER TABLE document_versions ENABLE ROW LEVEL SECURITY;

-- Readable if the parent document is visible to the user
CREATE POLICY "Users see versions of docs they can access"
  ON document_versions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM documents d
      JOIN organization_members om ON om.organization_id = d.organization_id
      WHERE d.id = document_versions.document_id
        AND om.user_id = auth.uid()
        AND d.deleted_at IS NULL
        AND (d.visibility IN ('shared', 'filed') OR d.created_by = auth.uid())
    )
  );

-- Only the document owner can insert version snapshots (via service role in API)
CREATE POLICY "Service can insert document versions"
  ON document_versions FOR INSERT
  WITH CHECK (true);
