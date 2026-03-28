## Summary
Creates the discussions system: 6 new tables (discussions, discussion_messages, discussion_decisions, discussion_learnings, discussion_next_steps, discussion_document_links) with full RLS.

## Gherkin
docs/features/discussions.md

## ADRs
ADR-003: Discussions as project features, not standalone products

## Design notes
- parent_type IN ('project', 'document', 'section') — section uses section_key for business plan sections
- Participants derived from message authors — no separate participants table needed
- Decisions/learnings/next_steps are normalized tables, not JSONB — enables future querying
- RLS: org-member access. App layer enforces parent-level access (e.g. private projects)
- discussion_document_links links discussions to docs they created or reference
