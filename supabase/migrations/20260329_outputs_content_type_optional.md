# outputs — content_type_id optional

## Summary
Makes `content_type_id` nullable on the `outputs` table so that project deliverables (briefs, reports, analyses, strategies, etc.) can be saved without belonging to a marketing content type.

## Gherkin specs
- Supports the project generate feature where a user creates a project deliverable (not marketing content) directly from a project

## ADRs
- Content types exist for marketing — they define platform rules, templates, cadence. Project outputs don't have those constraints.
- Keeping one outputs table (rather than a separate deliverables table) is simpler and lets project outputs benefit from the same attachment, editing, and deletion flows.

## Design notes
- The FK constraint (`REFERENCES content_types(id)`) remains — if a content_type_id is set, it must be valid. We only drop NOT NULL.
- Existing rows are unaffected (all have a content_type_id already).
