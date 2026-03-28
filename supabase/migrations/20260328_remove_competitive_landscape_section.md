# Migration: remove_competitive_landscape_section

## Summary
Removes the `competitive_landscape` key from all existing `business_plans.sections` JSONB rows, as this content is now sourced directly from the `competitors` table.

## Gherkin specs
- `docs/features/business-plan.md`

## ADRs
- Competitive landscape is structured data that already lives in the `competitors` table (name, positioning, strengths, weaknesses, pricing, battle card). Maintaining a free-text duplicate in the business plan caused two sources of truth that would inevitably diverge. The PDF generation pipeline now reads from `competitors` directly and formats the section automatically.

## Design notes
- The `-` operator on JSONB removes a key safely even if it doesn't exist on a given row.
- The `WHERE sections ? 'competitive_landscape'` guard limits the update to rows that actually have the key, keeping the migration a no-op for orgs that never filled it in.
- No data loss concern: any content previously in this field was a manual prose re-statement of data that still exists in the `competitors` table.
