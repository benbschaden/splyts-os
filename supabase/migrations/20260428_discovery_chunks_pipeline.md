# Migration: Discovery Chunks Pipeline

**File:** `20260428_discovery_chunks_pipeline.sql`

## Summary

Adds the storage required to chunk long discovery transcripts and reduce
them safely without losing content or hallucinating quotes:

- `discovery_entry_chunks` — one row per chunk; holds chunk text, byte
  offsets into `raw_content`, verified findings, verification stats,
  status, and the model + prompt version that produced the findings.
- `discovery_study_synthesis_runs` — provenance row written each time a
  study is synthesised; records the model, the number of entries
  included, the number of chunks consulted, the number of LLM-returned
  quotes that were dropped during verification, and the resulting
  Markdown.
- `discovery_entries.analysis_json` — verified entry-level digest (the
  reduce-1 output of the pipeline).
- `discovery_entries.raw_content_hash` — sha256 of `raw_content`. Used
  to short-circuit re-analysis when the transcript hasn't changed.
- `discovery_entries.analysis_markdown` — human-facing per-entry
  Markdown digest. New column.

## Gherkin specs supported

`docs/features/discovery-chunked-analysis.md`

## ADRs / design

`docs/superpowers/specs/2026-04-28-discovery-chunked-analysis-design.md`

## Design notes

- **Chunks live in their own table, not as JSONB on the entry.** Findings
  are large; querying or updating one chunk shouldn't rewrite an entire
  entry row.
- **`organization_id` is denormalised on chunks and synthesis runs** so
  RLS can enforce isolation without a join through `discovery_entries`.
- **Hard delete cascade from `discovery_entries`**. Chunks have no
  meaning without their entry; deleting the entry should remove them.
  This is the same pattern as the existing `discovery_entry_embeddings`
  table.
- **No `deleted_at` on chunks or runs.** They are derived artefacts.
  The user can rerun the pipeline, which deletes and rebuilds.
- **`status = 'pending' | 'succeeded' | 'failed'`** lets the pipeline
  insert chunk rows up front (so the UI can show progress) and fill in
  findings as each chunk completes.
- **`prompt_version` column** is a freeform string we increment when we
  materially change the extraction prompt, so old findings can be
  invalidated cleanly.

## How to apply

1. Open Supabase Dashboard → SQL Editor.
2. Paste the contents of `20260428_discovery_chunks_pipeline.sql`.
3. Run it.
4. Regenerate types:
   ```bash
   npx supabase gen types typescript --project-id <ref> > lib/types/database.ts
   ```
   (Until that runs, the application uses the untyped service client for
   the new tables — same pattern as `discovery_studies`.)
