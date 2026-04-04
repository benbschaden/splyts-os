# 20260404_playbooks

## Summary
Adds the `playbooks` table for team-facing SOPs and process guides. Playbooks are always org-visible — no private/shared model.

## Gherkin specs
- `docs/features/playbooks.md`

## ADRs
- ADR-001: Template-ready identity in database — category and content are data, not code
- ADR-002: Project-centric data model — playbooks are a standalone content type, not nested under projects

## Design notes
- **No visibility column** — playbooks are always org-visible. Personal notes belong in Documents (which have a private mode).
- **Soft deletes** — `deleted_at` column rather than hard delete, consistent with all other content tables.
- **Category as freeform text** — no enum or lookup table. The UI can suggest common categories (Content, Operations, Sales, etc.) but teams can use any label. This avoids schema migrations when a team needs a new category.
- **RLS: creator-only writes** — any org member can read. Only the creator can update or delete their own playbooks. Admins can delete via the service role in the API layer (which bypasses RLS), matching the pattern used across Documents.
- **Indexes** — org-scoped index for list queries, plus a compound category index for the grouped list view.
