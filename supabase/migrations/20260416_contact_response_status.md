# 20260416 — Contact response status

## Summary
Adds `response_status`, `response_status_reason`, and `response_status_updated_at` to `contacts` so the AI can flag which contacts have an outstanding reply needed.

## Gherkin specs
- `docs/features/contact-response-status.md`

## ADRs
- Status is a text column with a CHECK constraint (not an enum) for consistency with the existing `health` and `status` columns on this table.
- Three values: `needs_response` (reply required), `no_action_needed` (thread is settled), `in_progress` (draft underway — reserved for future use).
- `NULL` means the contact has never been scanned — distinct from `no_action_needed`.
- A partial index on `(organization_id, response_status)` WHERE `response_status IS NOT NULL` covers the common query of "how many contacts in this org need a response".

## Design notes
- `response_status_reason` is a plain TEXT field — not a foreign key. It stores the AI's one-sentence summary so the UI can show it without a join.
- This is separate from `health` intentionally. Health will track relationship trajectory (Mixpanel signals). Response status tracks the current communication thread's action state.
