# Migration: Project Materials and Rich Content

**File:** `20260328_project_materials_and_rich_content.sql`

## Summary

Extends projects into knowledge workspaces. Adds project materials (notes, files, links), output attachments, project visibility/tags/status, project-scoped chat sessions, new content type templates for long-form content, and a private storage bucket for file uploads.

## Gherkin specs

- `docs/features/feature-projects.md` — project lifecycle, materials, archive
- `docs/features/feature-content-types.md` — blog-post and journal-article templates
- `docs/features/company-chat.md` — project-scoped chat sessions

## Tables created

| Table | Purpose |
|-------|---------|
| `project_materials` | Notes, file references, and links attached to a project |
| `output_attachments` | Files (images, charts, datasets) linked to a specific output |

## Columns added

| Table | Column | Type | Purpose |
|-------|--------|------|---------|
| `outputs` | `metadata` | `JSONB` | Structured data (references, abstract, chart specs) |
| `projects` | `tags` | `TEXT[]` | Freeform tags for filtering/search |
| `projects` | `visibility` | `TEXT` | `private` (creator only) or `shared` (all org members) |
| `projects` | `status` | `TEXT` | `active` or `archived` |
| `chat_sessions` | `project_id` | `UUID` | Optional FK to projects, makes chat project-scoped |
| `org_project_seeds` | `visibility` | `TEXT` | Default visibility for seeded projects |

## Content type templates seeded

| Slug | Name | Structure |
|------|------|-----------|
| `blog-post` | Blog Post | Headline, intro, 3-5 body sections with subheadings, conclusion |
| `journal-article` | Journal Article | Abstract, introduction, methods, findings, discussion, conclusion |

## Storage

- **Bucket:** `project-files` (private, 50MB limit)
- **Allowed types:** images (JPEG, PNG, WebP, GIF, SVG), PDF, CSV, plain text, XLSX, DOCX, JSON
- **Access:** Signed URLs for downloads (never public)

## RLS policies

- `project_materials`: org-member scoped (same pattern as outputs)
- `output_attachments`: accessible through parent output's org membership
- `projects` select policy updated: shared projects visible to all org members, private projects visible only to creator
- Storage `project-files`: authenticated users can upload/read/delete

## Design notes

- `project_materials.organization_id` is denormalized from the parent project for efficient RLS checks without joins
- `output_attachments` does not have `organization_id`; access is derived from the parent output
- Existing projects are backfilled as `visibility = 'shared'` and `status = 'active'` to preserve current behavior
- The `projects_select` RLS policy is replaced (not added alongside) to avoid conflicting policies
- Content type template inserts use `ON CONFLICT DO NOTHING` to be safely re-runnable
