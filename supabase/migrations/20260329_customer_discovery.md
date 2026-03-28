# Migration: Customer Discovery

**File:** `20260328_customer_discovery.sql`

## Summary

Adds `discovery_entries` and `discovery_entry_embeddings` tables for capturing structured research signal at the project level, and inserts a "Customer Discovery" default project seed under the "Research" category.

## Gherkin specs

Supports all scenarios in `docs/features/customer-discovery.md`.

## ADRs

- **Separate table, not project_materials** — `project_materials` is a general-purpose notes/files/links layer with no structure. Discovery entries have type-specific fields (sentiment, segment, JTBD, star rating, platform) that can't live in a generic content column. Using a dedicated table keeps queries typed and AI injection selective.
- **Type-specific fields as nullable columns** — Rather than a JSONB blob, the interview/review fields are explicit nullable columns. This allows indexed queries (e.g. `WHERE star_rating < 3`) and makes the schema self-documenting.
- **Embeddings separate table** — Follows the same pattern as `document_embeddings` and `project_material_embeddings`. The embedding is generated asynchronously and the entry is usable immediately without it.
- **`include_in_ai` defaults to false** — Discovery entries can contain sensitive, unverified signal. The user explicitly opts in individual entries rather than everything being included.
- **`source_material_id` nullable FK** — Links an entry back to an uploaded source file (e.g. interview transcript PDF in project_materials). Optional — many entries will be typed directly.

## Design notes

- `tags TEXT[]` uses a GIN index for efficient `@>` array overlap queries.
- `entry_date DATE` (not TIMESTAMPTZ) — captures when the signal was collected, not when it was entered. Interviews from 3 months ago should carry that date.
- `user_segment` CHECK constraint limited to known B2C SaaS segments; can be relaxed in a later migration if needed.
- The seed row `sort_order = 1` places Customer Discovery after Marketing Content (`sort_order = 0`) in setup flows.
- `vector` extension is required — already enabled by `20260328_retrieval_embeddings.sql`. The `ivfflat` index uses `lists = 100` matching the other embedding tables in the system.
