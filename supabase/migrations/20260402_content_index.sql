-- Migration: Universal content index
-- Creates a unified content_index table for semantic search across all content types.
-- Migrates existing data from document_embeddings, project_material_embeddings,
-- and discovery_entry_embeddings into the new table.

-- content_index: one row per indexed content item across all content types
CREATE TABLE IF NOT EXISTS content_index (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id  UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  content_type     TEXT NOT NULL,
  content_id       UUID NOT NULL,
  title            TEXT NOT NULL DEFAULT '',
  summary          TEXT NOT NULL DEFAULT '',
  embedding        vector(1536),
  metadata         JSONB NOT NULL DEFAULT '{}',
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(content_type, content_id)
);

CREATE INDEX IF NOT EXISTS content_index_org_type_idx
  ON content_index (organization_id, content_type);

CREATE INDEX IF NOT EXISTS content_index_vector_idx
  ON content_index USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

ALTER TABLE content_index ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users see content index for their org"
  ON content_index FOR SELECT
  USING (
    organization_id IN (
      SELECT om.organization_id FROM organization_members om
      WHERE om.user_id = auth.uid()
    )
  );

CREATE POLICY "Service can manage content index"
  ON content_index FOR ALL
  USING (true)
  WITH CHECK (true);

-- Unified search RPC: semantic search across all indexed content
CREATE OR REPLACE FUNCTION search_content_index(
  query_embedding vector(1536),
  org_id UUID,
  result_limit INT DEFAULT 20,
  type_filter TEXT[] DEFAULT NULL
)
RETURNS TABLE (
  content_type TEXT,
  content_id UUID,
  title TEXT,
  summary TEXT,
  metadata JSONB,
  similarity FLOAT
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    ci.content_type,
    ci.content_id,
    ci.title,
    ci.summary,
    ci.metadata,
    1 - (ci.embedding <=> query_embedding) AS similarity
  FROM content_index ci
  WHERE
    ci.organization_id = org_id
    AND ci.embedding IS NOT NULL
    AND (type_filter IS NULL OR ci.content_type = ANY(type_filter))
  ORDER BY ci.embedding <=> query_embedding
  LIMIT result_limit;
$$;

-- Migrate existing document embeddings
INSERT INTO content_index (organization_id, content_type, content_id, title, summary, embedding, created_at, updated_at)
SELECT
  d.organization_id,
  'document',
  d.id,
  COALESCE(d.title, ''),
  COALESCE(d.summary, LEFT(d.content, 500)),
  de.embedding,
  de.updated_at,
  de.updated_at
FROM document_embeddings de
JOIN documents d ON d.id = de.document_id
WHERE d.deleted_at IS NULL AND de.embedding IS NOT NULL
ON CONFLICT (content_type, content_id) DO NOTHING;

-- Migrate existing project material embeddings
INSERT INTO content_index (organization_id, content_type, content_id, title, summary, embedding, created_at, updated_at)
SELECT
  pm.organization_id,
  'project_material',
  pm.id,
  COALESCE(pm.title, ''),
  LEFT(COALESCE(pm.content, ''), 500),
  pme.embedding,
  pme.updated_at,
  pme.updated_at
FROM project_material_embeddings pme
JOIN project_materials pm ON pm.id = pme.material_id
WHERE pm.deleted_at IS NULL AND pme.embedding IS NOT NULL
ON CONFLICT (content_type, content_id) DO NOTHING;

-- Migrate existing discovery entry embeddings
INSERT INTO content_index (organization_id, content_type, content_id, title, summary, embedding, created_at, updated_at)
SELECT
  de_entry.organization_id,
  'discovery_entry',
  de_entry.id,
  COALESCE(de_entry.source, de_entry.entry_type, ''),
  LEFT(COALESCE(de_entry.raw_content, ''), 500),
  dee.embedding,
  dee.updated_at,
  dee.updated_at
FROM discovery_entry_embeddings dee
JOIN discovery_entries de_entry ON de_entry.id = dee.entry_id
WHERE dee.embedding IS NOT NULL
ON CONFLICT (content_type, content_id) DO NOTHING;
