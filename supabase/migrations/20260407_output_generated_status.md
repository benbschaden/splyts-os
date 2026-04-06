# Migration: output_generated_status

## Summary
Adds a `'generated'` status value to `outputs.status` to represent content that has been AI-generated but not yet explicitly published by the user. Backfills existing rows that had `status = 'published'` with a null `published_at` (these were never actually published — they were just generated and incorrectly defaulted to the published status).

## Gherkin specs
Supports the Content Studio feature:
- `docs/features/content-studio.md`

## ADRs
- The three statuses form a clear one-way pipeline: `draft` → `generated` → `published`
- `published` always implies `published_at IS NOT NULL` after this migration
- `generated` means the AI session completed and the user accepted the output, but hasn't marked it live yet

## Design notes
- The existing DB default `'published'` on `status` is intentionally left as-is for backwards compatibility on non-Content Studio projects that expect outputs to be immediately visible. Content Studio's save path now explicitly passes `'generated'`.
- The backfill is safe: any row with `status = 'published'` and `published_at IS NULL` was never surfaced in the Published section (which already filtered by `published_at IS NOT NULL`), so this is purely a correctness fix.
