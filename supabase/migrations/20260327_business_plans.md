# Migration: business_plans

## Summary
Adds the `business_plans` table — one row per org, storing all sections as a JSONB column.

## Gherkin specs
- `docs/features/business-plan.md`

## ADRs
- JSONB for sections rather than a child table: sections are always read/written as a batch, never queried individually. JSONB keeps the schema simple and avoids N+1 on save.

## Design notes
- `organization_id` has a UNIQUE constraint — one plan per org.
- Section definitions (keys, labels, descriptions, order) live in `lib/company/business-plan-sections.ts` so they can be changed without a migration.
- Only admins can insert/update; all org members can read.
