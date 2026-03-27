# Migration: social_proof

## Summary
Adds the `social_proof` table for testimonials, case studies, metrics, and awards per organization, with approval and AI inclusion flags.

## Gherkin specs
- Company OS social proof management (drawer CRUD).

## ADRs
- `proof_type` as text with app-level enum validation: simple to extend without migrations.
- Soft delete with `deleted_at`: consistent with other content tables.
- `tags` as `TEXT[]` for lightweight categorization without a join table.

## Design notes
- `approved` gates customer-facing or sensitive content; `include_in_ai` is separate so drafts can stay out of prompts.
- Metric-type entries use `metric_value` + `metric_label` when the primary display is numeric or shorthand rather than a long quote.
