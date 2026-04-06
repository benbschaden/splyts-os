# 20260407_meeting_documents

## Summary
Adds `meeting_documents` (draft/published notes from the meeting Discuss flow) and `meeting_document_projects` (project visibility for published documents).

## Gherkin specs
See `docs/features/meetings.md` (Discuss and documents scenarios).

## Design notes
- Documents inherit meeting-level access via `meeting_id` — RLS mirrors meeting visibility (creator, attendees, or org-wide).
- Publishing writes rows to `meeting_document_projects`; the UI defaults to projects already linked via `meeting_project_links` and allows additional org projects.
- Soft-delete on `meeting_documents` only; junction rows cascade on document delete.
