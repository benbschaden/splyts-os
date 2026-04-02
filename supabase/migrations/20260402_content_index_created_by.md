# Migration: Content Index created_by

## Summary
Adds `created_by UUID` column to `content_index` for activity reporting. Enables querying "what did person X create in date range Y?"

## Gherkin specs
- `docs/features/activity-reports.md`

## Design notes
- Nullable because existing rows won't have the value until backfilled
- Compound index on `(created_by, created_at)` for efficient activity queries
- Populated by the indexing pipeline from the source table's `created_by` field
