-- Migration: Drop legacy per-type embedding tables
-- Apply ONLY after verifying content_index is fully populated and retrieval works.
-- The data was migrated in 20260402_content_index.sql.

-- Drop old RPC functions
DROP FUNCTION IF EXISTS search_documents_by_embedding(vector(1536), uuid, uuid, int);
DROP FUNCTION IF EXISTS search_materials_by_embedding(vector(1536), uuid, uuid, int);

-- Drop old embedding tables (CASCADE removes indexes and policies)
DROP TABLE IF EXISTS document_embeddings CASCADE;
DROP TABLE IF EXISTS project_material_embeddings CASCADE;
DROP TABLE IF EXISTS discovery_entry_embeddings CASCADE;
