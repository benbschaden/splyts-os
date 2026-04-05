# 20260405_chat_session_captured_at

## Summary
Adds `captured_at` column to `chat_sessions` to record when a session was captured as a document.

## Gherkin specs
- Feature: Capture chat as document — after capture, the session should be marked and visually separated from active conversations.

## ADRs
- Using a nullable `TIMESTAMPTZ` column rather than a boolean flag so we retain the timestamp of capture for display purposes.

## Design notes
- `NULL` means never captured; non-NULL means captured. The value is set by the capture API route after successfully creating the document.
- No RLS change required — the column is on `chat_sessions`, which already has RLS scoped by `organization_id`.
