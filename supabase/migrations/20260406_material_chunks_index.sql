-- Migration: Expression index for material chunk lookups + fetch_material_chunks RPC
-- Supports efficient retrieval of all chunks for a specific material (for full-document analysis).

-- Expression index: fast lookup of all chunks belonging to a material_id
CREATE INDEX IF NOT EXISTS content_index_material_id_idx
  ON content_index ((metadata->>'material_id'))
  WHERE content_type = 'project_material_chunk';

-- RPC: fetch all chunks for a material in chunk_index order
-- Used to reconstruct full document text when the user requests complete analysis.
CREATE OR REPLACE FUNCTION fetch_material_chunks(p_material_id uuid)
RETURNS TABLE (
  chunk_index   int,
  total_chunks  int,
  chunk_content text,
  material_title text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    (metadata->>'chunk_index')::int   AS chunk_index,
    (metadata->>'total_chunks')::int  AS total_chunks,
    summary                            AS chunk_content,
    metadata->>'material_title'        AS material_title
  FROM content_index
  WHERE content_type = 'project_material_chunk'
    AND metadata->>'material_id' = p_material_id::text
  ORDER BY (metadata->>'chunk_index')::int;
$$;
