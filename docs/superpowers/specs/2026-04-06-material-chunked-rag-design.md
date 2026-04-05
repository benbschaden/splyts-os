# Material Chunked RAG — Design Spec

**Date:** 2026-04-06  
**Status:** Approved

---

## Problem

Project materials (uploaded transcripts, PDFs, notes) are stored with up to 60,000 characters of extracted text. But the AI only ever sees the first **500 characters** of each file, because `buildProjectMaterialsBlock` in `lib/ai/prompts.ts` calls `content.slice(0, 500)`. Additionally, the content_index stores a 500-char summary per material, so even semantic retrieval only returns that tiny slice.

Use cases that are currently broken:
- "Analyse the March 30 podcast and give me key points, a clean summary not missing anything, what's relevant for us, and which speaker I should talk to"
- "Across all 100 transcripts I've uploaded, which topics come up most and which speakers are most relevant to us?"
- Cross-referencing transcript content with existing company OS data (personas, brand context, product info)

---

## Goal

Make project materials fully readable and semantically searchable at any scale — 1 transcript or 100 — by chunking them into the existing `content_index` infrastructure.

---

## Architecture

### Core idea

At upload time, split large file content into overlapping ~1,000-character chunks. Index each chunk as a separate `content_index` row (`content_type = 'project_material_chunk'`). At query time, semantic search retrieves the most relevant chunks from across all materials — including cross-referencing with all other company OS data already in the index.

The existing `content_index` table and `search_content_index` RPC require no schema changes. The `UNIQUE(content_type, content_id)` constraint is satisfied because each chunk gets its own UUID.

### What changes

**Upload pipeline** — after extracting text, chunk it and index each piece.

**Content registry** — add `project_material_chunk` entry that uses the chunk text directly as its summary (no 500-char truncation — chunks are already small).

**Retrieval** — add `project_material_chunk` to the type filter in `retrieveRelevantDocuments`. Raise the default limit from 5 to 20 so transcript-heavy queries get meaningful coverage.

**Prompts** — `buildProjectMaterialsBlock` stops injecting file content entirely (files show only title/filename). Retrieved chunks in `retrievedContext` carry the actual content, now with source attribution showing the transcript title and chunk position.

**Backfill** — new endpoint `POST /api/projects/[id]/materials/reindex` re-chunks and re-indexes all existing materials for a project. Runs fire-and-forget.

**Migration** — add a functional expression index on `content_index(metadata->>'material_id')` for fast full-material chunk fetches. Also add a function `fetch_material_chunks(material_id)` for ordered full-document reconstruction.

---

## Data model

No new tables. Each chunk row in `content_index`:

```
content_type: 'project_material_chunk'
content_id:   <new UUID per chunk>
organization_id: <org id>
title:        '<material title or filename>'
summary:      '<chunk text, ~1000 chars>'
embedding:    <1536-dim vector>
metadata: {
  material_id: '<project_materials.id>',
  project_id:  '<project id>',
  chunk_index: 3,
  total_chunks: 64,
  material_type: 'file',
  material_title: 'March 30 Podcast.txt'
}
```

---

## Chunk parameters

- Chunk size: **1,000 characters**
- Overlap: **150 characters**
- A 60k transcript → ~64 chunks
- 100 transcripts → ~6,400 chunk rows — well within pgvector's capacity with the existing ivfflat index

---

## Retrieval behaviour

### Cross-corpus queries (100 transcripts)
Query embeds → `search_content_index` returns top-20 most relevant chunks from any/all transcripts + other company OS data → AI receives labelled excerpts with source attribution.

### Single-material deep analysis
When the user asks for a full analysis of a specific transcript, the chat system can call `fetchAllMaterialChunks(materialId)` which fetches all chunks for that material ordered by `chunk_index`, reassembling the full text. This is wired into the messages route: when retrieved context is dominated by chunks from one material and the query signals full-document analysis, inject the full reconstructed text.

---

## Prompt changes

### `buildProjectMaterialsBlock`
Before:
```
Files:
- march_30_podcast.txt
  Meg, thanks for joining. Today we're...
```

After:
```
Files:
- march_30_podcast.txt [full text searchable via retrieval]
- april_2_podcast.txt [full text searchable via retrieval]
```

### `buildRetrievedContextBlock`
Before:
```
[project material] march_30_podcast.txt
Meg, thanks for joining. Today we're...
```

After:
```
[project material — march_30_podcast.txt, chunk 3/64]
...discussion of volume pricing and how the enterprise tier compares...
```

---

## Files changed

| File | Change |
|------|--------|
| `lib/indexing/chunk-material.ts` | NEW — chunking logic + `indexMaterialChunks` |
| `lib/indexing/content-registry.ts` | Add `project_material_chunk` type |
| `app/api/projects/[id]/materials/upload/route.ts` | Call `indexMaterialChunks` after upload |
| `lib/retrieval/search.ts` | Add `project_material_chunk` to type filter; add `fetchAllMaterialChunks`; raise limit to 20 |
| `lib/ai/prompts.ts` | Fix `buildProjectMaterialsBlock` files section; improve `buildRetrievedContextBlock` attribution |
| `app/api/projects/[id]/materials/reindex/route.ts` | NEW — backfill endpoint |
| `supabase/migrations/20260406_material_chunks_index.sql` | Add expression index + `fetch_material_chunks` RPC |
| `supabase/migrations/20260406_material_chunks_index.md` | Companion doc |

---

## Limitations (honest)

- "Full summary not missing anything" for a single transcript: the `fetchAllMaterialChunks` path solves this, but routing to it automatically requires intent detection. Phase 1 wires the function; the intent detection heuristic is: if the query mentions a material title explicitly and retrieval returns ≥5 chunks from that same material, reconstruct and inject the full text.
- Embeddings require `OPENAI_API_KEY` configured. If absent, chunking still runs but no embeddings are generated (same behaviour as existing `indexContent`).
- The 60k character ingest cap at upload is unchanged. A 3-hour transcript over 60k chars will be truncated at extraction time (pre-existing limitation, not introduced here).

---

## ADRs

**Why not a new table?** `content_index` is already the universal semantic store. Adding a content type reuses the existing vector index, RLS policy, and search RPC without another table to maintain.

**Why 1,000-char chunks?** Matches the embedding model's sweet spot: small enough to be semantically specific (avoids diluting relevance with unrelated context), large enough to give the AI meaningful passage context (~250 tokens).

**Why 150-char overlap?** Prevents a key sentence at a chunk boundary from being cut in half. At 15% of chunk size this is standard.

**Why remove file content from `buildProjectMaterialsBlock`?** The system prompt is constructed once per session. With 100 transcripts all listed with 500-char snippets, the prompt would still be useless (still only first 500 chars) and bloated. Retrieval is the right mechanism — it's dynamic and query-specific.
