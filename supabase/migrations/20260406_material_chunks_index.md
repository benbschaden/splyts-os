# 20260406_material_chunks_index

## Summary
Adds an expression index on `content_index(metadata->>'material_id')` for fast chunk
lookups, and a `fetch_material_chunks` RPC to retrieve all chunks for a material in order.

## Gherkin specs
Supports: material chunked RAG feature

## ADRs
- Uses a partial expression index (WHERE content_type = 'project_material_chunk') to keep
  the index small and fast — only chunk rows need this lookup.
- SECURITY DEFINER on the RPC allows it to be called from service-client contexts without
  requiring the caller to have direct table access.

## Design notes
- `fetch_material_chunks` is used when a user explicitly requests full analysis of a
  specific transcript — it reassembles all chunks in order.
- The expression index supports DELETE ... WHERE metadata->>'material_id' = $1, which is
  how we clean up old chunks before re-indexing.
