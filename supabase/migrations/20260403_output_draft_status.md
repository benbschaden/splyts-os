# Migration: output_draft_status

## Summary
Adds `status` and `draft_messages` columns to `outputs` to support auto-saving generation sessions as drafts. Users can close the generate dialog at any time and resume from where they left off. Publishing flips `status` to `published` and clears the chat history.

## Gherkin specs
Supports: "Persist generation sessions so users can close and resume at any time"

## ADRs
- Drafts live on the `outputs` table rather than a separate `generation_sessions` table — keeps the data model simple and reuses all existing output queries and RLS.
- `draft_messages` is JSONB on the row rather than a child table — chat history is only needed while a session is in progress and doesn't need to be queried independently.
- `status` defaults to `'published'` so all existing outputs are unaffected.

## Design notes
- `status = 'draft'` outputs are only shown to their creator (`created_by`), filtered at the query layer.
- `draft_messages` is cleared when the draft is published to avoid storing stale data.
- The partial index `idx_outputs_draft_project_user` covers the fast lookup: "does this user have a draft in this project?".
