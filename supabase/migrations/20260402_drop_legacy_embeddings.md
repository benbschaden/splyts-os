# Migration: Drop Legacy Embedding Tables

## Summary
Removes the old per-type embedding tables (`document_embeddings`, `project_material_embeddings`, `discovery_entry_embeddings`) and their associated search RPCs. All data was migrated to the unified `content_index` table in `20260402_content_index.sql`.

## Gherkin specs
- `docs/features/content-index.md`

## ADRs
- Per `docs/superpowers/specs/2026-04-02-content-index-design.md`, the unified table replaces per-type tables.

## Design notes
- This migration should be applied AFTER verifying the backfill is complete and the unified search works correctly.
- The old RPC functions (`search_documents_by_embedding`, `search_materials_by_embedding`) are dropped because `lib/retrieval/search.ts` now calls `search_content_index` instead.
- CASCADE ensures associated indexes and RLS policies are cleaned up.
