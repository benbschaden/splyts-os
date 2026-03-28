# 20260328_content_studio

## Summary
Renames the "Marketing Content" tool project to "Content Studio", adds a `tool_key` identifier column to dispatch a custom UI, creates the `content_ideas` table for the content backlog, and adds time-windowed performance columns to `outputs`.

## Gherkin specs
- `docs/features/content-studio.md`

## ADRs
- `tool_key` is a nullable TEXT column (not an enum) so new tool-specific views can be added via future migrations without modifying a check constraint.
- `content_ideas.platform_owner` is constrained to `'author' | 'company'` — maps to the existing author persona concept (named author page vs company brand page).
- New output performance columns (`views_1d`, `views_7d`, `views_30d`, `website_visits`, `email_signups`, `performance_recorded_at`) are all nullable — not required, filled in post-publish.
- Existing `reach`, `reach_metric`, `engagement`, `performance_notes` columns are kept intact; the new columns add time-windowed specificity.
- `content_ideas` is project-scoped so it links to the Content Studio tool project specifically.

## Design notes
- `platform` in `content_ideas` is free-text in the DB; the application layer enforces the allowed list (LinkedIn, Email Newsletter, etc.) to keep the schema flexible for future platforms.
- `outputs_published_org_idx` is a partial index covering only published, non-deleted outputs — this is the exact predicate used by the Published tab query, so it avoids a full table scan.
- The backfill in step 3 updates only `project_type = 'tool'` rows to avoid touching any user-created project that happened to be named "Marketing Content".
