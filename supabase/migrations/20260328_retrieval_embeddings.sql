-- Migration: Semantic retrieval (RAG infrastructure)
-- Enables pgvector, creates embedding tables for documents and project materials
-- Creates permission-filtered RPC functions for vector search

CREATE EXTENSION IF NOT EXISTS vector;

-- Embedding storage for documents
CREATE TABLE IF NOT EXISTS document_embeddings (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  content     TEXT NOT NULL,
  embedding   vector(1536),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (document_id)
);

CREATE INDEX IF NOT EXISTS doc_embeddings_vector_idx ON document_embeddings
  USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

ALTER TABLE document_embeddings ENABLE ROW LEVEL SECURITY;

-- Readable if the parent document is readable by the user
CREATE POLICY "Users see embeddings of docs they can access"
  ON document_embeddings FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM documents d
      JOIN organization_members om ON om.organization_id = d.organization_id
      WHERE d.id = document_embeddings.document_id
        AND om.user_id = auth.uid()
        AND d.deleted_at IS NULL
        AND (d.visibility IN ('shared', 'filed') OR d.created_by = auth.uid())
    )
  );

CREATE POLICY "Service can manage document embeddings"
  ON document_embeddings FOR ALL
  USING (true)
  WITH CHECK (true);

-- Embedding storage for project materials
CREATE TABLE IF NOT EXISTS project_material_embeddings (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  material_id UUID NOT NULL REFERENCES project_materials(id) ON DELETE CASCADE,
  content     TEXT NOT NULL,
  embedding   vector(1536),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (material_id)
);

CREATE INDEX IF NOT EXISTS mat_embeddings_vector_idx ON project_material_embeddings
  USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

ALTER TABLE project_material_embeddings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users see material embeddings for their org"
  ON project_material_embeddings FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM project_materials pm
      JOIN organization_members om ON om.organization_id = pm.organization_id
      WHERE pm.id = project_material_embeddings.material_id
        AND om.user_id = auth.uid()
        AND pm.deleted_at IS NULL
    )
  );

CREATE POLICY "Service can manage material embeddings"
  ON project_material_embeddings FOR ALL
  USING (true)
  WITH CHECK (true);

-- RPC: permission-filtered document vector search
-- Returns top N most semantically similar documents accessible to the user
CREATE OR REPLACE FUNCTION search_documents_by_embedding(
  query_embedding vector(1536),
  org_id uuid,
  searching_user_id uuid,
  result_limit int DEFAULT 5
)
RETURNS TABLE (
  document_id uuid,
  similarity float,
  title text,
  summary text,
  visibility text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    d.id AS document_id,
    1 - (de.embedding <=> query_embedding) AS similarity,
    d.title,
    COALESCE(d.summary, LEFT(d.content, 300)) AS summary,
    d.visibility
  FROM document_embeddings de
  JOIN documents d ON d.id = de.document_id
  WHERE
    d.organization_id = org_id
    AND d.deleted_at IS NULL
    AND (
      d.visibility IN ('shared', 'filed')
      OR d.created_by = searching_user_id
    )
    AND de.embedding IS NOT NULL
  ORDER BY de.embedding <=> query_embedding
  LIMIT result_limit;
$$;

-- RPC: permission-filtered project material vector search
CREATE OR REPLACE FUNCTION search_materials_by_embedding(
  query_embedding vector(1536),
  org_id uuid,
  project_id_filter uuid DEFAULT NULL,
  result_limit int DEFAULT 3
)
RETURNS TABLE (
  material_id uuid,
  similarity float,
  title text,
  content_preview text,
  mat_project_id uuid
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    pm.id AS material_id,
    1 - (pme.embedding <=> query_embedding) AS similarity,
    pm.title,
    LEFT(COALESCE(pm.content, ''), 300) AS content_preview,
    pm.project_id AS mat_project_id
  FROM project_material_embeddings pme
  JOIN project_materials pm ON pm.id = pme.material_id
  WHERE
    pm.organization_id = org_id
    AND pm.deleted_at IS NULL
    AND (project_id_filter IS NULL OR pm.project_id = project_id_filter)
    AND pme.embedding IS NOT NULL
  ORDER BY pme.embedding <=> query_embedding
  LIMIT result_limit;
$$;
