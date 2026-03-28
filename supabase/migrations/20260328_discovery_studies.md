# Migration: 20260328_discovery_studies

## Summary

Adds `discovery_studies` as a first-class concept within the Customer Discovery tool. Studies organise research efforts — each has a name, goal, method, a script (interview guide), and an analysis (synthesis). Discovery entries gain a nullable `study_id` FK so they can belong to a study. Also extends `entry_type` to include `'email'` for logging beta feedback emails.

## Gherkin specs

- `docs/features/customer-discovery.md` — all Study scenarios added in this session

## ADRs

**Why a separate `discovery_studies` table rather than a folder-like hierarchy?**  
Studies are a distinct concept with their own fields (goal, script, analysis, status) that don't map to a generic folder. A dedicated table keeps the types clean and avoids a polymorphic blob.

**Why nullable `study_id` on entries?**  
Existing entries are unsorted. Making it nullable means the migration is non-destructive and existing data remains visible in the "All Entries" view. Users can assign entries to a study in future.

**Why `ON DELETE SET NULL` for study_id?**  
Deleting a study should not cascade-delete its entries — the raw data (interviews, reviews, etc.) still has value. Entries become "unsorted" and remain in All Entries.

**Why add `'email'` to the entry_type CHECK rather than a new table?**  
Email feedback is structurally the same as other entry types (source, content, sentiment, tags). Adding it to the existing enum keeps the data model simple and avoids a separate code path. The existing `source` field holds the sender address.

## Design notes

- `script_markdown` and `analysis_markdown` are plain text (stored as markdown, rendered as a textarea in the UI). No rich-text schema needed at this stage.
- `status` defaults to `'active'`. Teams mark it `'complete'` when the study concludes and `'archived'` to hide it.
- `sort_order` defaults to 0 for all rows; future drag-to-reorder can use this column without a schema change.
- The `update_updated_at` trigger function already exists from earlier migrations — no need to recreate it.
