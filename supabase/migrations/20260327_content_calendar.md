# Migration: content_calendar

Creates the `content_calendar` table — scheduled content items with a full lifecycle from idea to published with stats.

**Key fields:** `title`, `description` (brief), `scheduled_date`, `content_type_id`, `platform`, `author_id`, `assigned_to`, `output_id` (links to generated output), `status` (idea/scheduled/in_progress/generated/published/cancelled), `notes`.

**RLS:** All org members can create and view; creators OR admins can update/delete. This is writable by all — at scale every team member manages their own content.

**Indexes:** 
- `(organization_id, scheduled_date)` for calendar date queries
- `(organization_id, status)` for status filter queries
- `(output_id)` for joining to outputs
