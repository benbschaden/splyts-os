# 20260328_conflict_trust_resolution

## Summary
Adds `trusted_file_id` and `trusted_excerpt` columns to `company_knowledge_conflicts` so admins can pick which side of a conflict to treat as authoritative, and that excerpt is injected into the AI suggest prompt as an override.

## Gherkin specs
Supports the "Conflict detected between two uploads" scenario in `docs/features/company-knowledge.md`, extending dismiss to include trust selection.

## ADRs
- Keeping the excerpt on the conflict record (not just a file reference) means the resolution survives if the source file is later deleted.
- `trusted_file_id` is kept for auditing purposes (which file won) but is not the primary source for the prompt — `trusted_excerpt` is.

## Design notes
- Both columns are nullable: a conflict can still be dismissed without picking a trusted version.
- No RLS changes needed — the existing update policy covers both new columns.
