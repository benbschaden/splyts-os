# Migration: 20260330_outputs_summary

## Summary
Adds a nullable `summary TEXT` column to the `outputs` table so that generated content has an embedding anchor for future RAG / semantic search.

## Gherkin specs
Supports future retrieval feature: "search/link any output to any context via semantic similarity."

## ADRs
- Column is nullable; existing rows are unaffected and can be backfilled on demand.
- Summary is generated at write time (brief + content → single focused sentence) rather than lazily, so it is always present for new outputs.

## Design notes
- Nullable not NOT NULL: avoids a hard dependency on AI availability at save time. If summarisation fails, the output still saves.
- Summary text is intended as the embedding anchor — it should describe *what the content is and what it says*, not merely truncate the body. A sentence like "LinkedIn post positioning [Company] as the training intelligence leader for strength coaches" is more searchable than 200 chars of the post body.
