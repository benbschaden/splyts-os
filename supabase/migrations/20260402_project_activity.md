# 20260402_project_activity

## Summary
Adds a `project_activity` table for logging notable actions by users within projects, and a `notifications_last_read_at` column on `user_profiles` to track when each user last opened their notification panel.

## Gherkin specs
- Users see a notification bell with a count of unread activity since they last checked
- Clicking the bell shows a dropdown: who did what, when (output generated, file uploaded, note added, link added, discussion started/resolved)
- Activity from the current user's own actions is excluded from their notification feed

## ADRs
- Service-role-only inserts (no direct client writes): activity is logged server-side from API routes as fire-and-forget calls, preventing spoofed events
- `notifications_last_read_at` lives on `user_profiles` (one column, one row per user) rather than a separate table — unread count is a single comparison, no join needed
- Activity is org-scoped (not project-member-scoped): all members of the org see project activity. Fine for small teams; can be restricted by visibility rules later.
- No message content is logged — only the action type and a short `entity_name` (filename, output title, discussion title). No PII or content leaks via this table.

## Design notes
- `ON DELETE CASCADE` on both org and project FK ensures cleanup when either is deleted
- Two indexes: one on `(organization_id, created_at DESC)` for the notification feed, one on `(project_id, created_at DESC)` for per-project activity views
- The RLS SELECT policy matches the existing pattern in other tables (member check via `organization_members`)
