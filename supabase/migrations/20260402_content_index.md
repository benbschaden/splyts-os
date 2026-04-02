# Migration: Universal Content Index

## Summary
Creates a unified `content_index` table for semantic search across all content types. Migrates existing data from `document_embeddings`, `project_material_embeddings`, and `discovery_entry_embeddings`.

## Gherkin specs
- `docs/features/content-index.md`

## ADRs
- Unified table over per-type tables (see `docs/superpowers/specs/2026-04-02-content-index-design.md`)
- Polymorphic `(content_type, content_id)` with UNIQUE constraint instead of per-type FKs
- IVFFlat index for vector similarity (consistent with existing embedding tables)

## Design notes
- `content_type` + `content_id` is UNIQUE, enabling upsert on conflict
- `metadata` JSONB stores type-specific extras (project_id, status, tags) for filtered queries
- RLS scopes to org membership, same pattern as all other tables
- `search_content_index` RPC supports optional `type_filter` array for scoped searches
- Existing embedding data is migrated in-place; old tables will be dropped in a subsequent migration after verification
- The `summary` field stores a heuristic text summary (concatenated fields, truncated) — not AI-generated. AI summaries are a future enhancement.
