# 20260402_discussion_read_receipts

## Summary
Adds a `discussion_read_receipts` table to track when each user last read each discussion, enabling unread counts and notification badges.

## Gherkin specs
- Global discussions inbox shows unread count per discussion
- Bell icon in sidebar shows total unread discussion count
- Opening a discussion marks it as read

## ADRs
- One row per `(discussion_id, user_id)` pair; upserted on every open — low write volume, simple reads
- `last_read_at` compared against `discussions.updated_at` to determine if unread (no N+1 message count required)
- RLS scoped to `auth.uid()` — users can only see and update their own receipts

## Design notes
- Does not track per-message read state — only per-discussion. This is sufficient for the inbox unread count feature.
- `ON DELETE CASCADE` ensures receipts are cleaned up automatically when a discussion is deleted.
- No `organization_id` column needed — scoped via the `discussions` FK which already has org isolation via its own RLS.
