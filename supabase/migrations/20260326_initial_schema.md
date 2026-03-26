# Migration: 20260326_initial_schema

## Summary
Creates the full V1 schema — all core tables, RLS policies, indexes, updated_at triggers, and seeds the three base content type templates.

## Gherkin specs supported
- `feature-org-setup.md` — organizations, organization_members
- `feature-auth.md` — organization_members (role assignment on sign-up)
- `feature-roles.md` — member_role enum, organization_members.role column
- `feature-projects.md` — projects, project_items
- `feature-brand-context.md` — brand_context
- `feature-content-types.md` — content_type_templates, content_types
- `feature-generate-content.md` — outputs, content_types, brand_context
- `feature-output-library.md` — outputs

## ADRs referenced
- `ADR-001` — template-ready identity in database (company name in organizations.name, not code)
- `ADR-002` — project-centric data model (project_items join table, no folder columns)
- `ADR-004` — AI as a layer (brand_context stores all prompt inputs as structured columns)

## Design notes

**All tables before all policies**
RLS policies can reference other tables. Creating policies inline with each table causes "relation does not exist" errors when a policy references a table not yet created. All tables are created first, then all policies.

**Soft deletes (`deleted_at`)**
Content rows (projects, content_types, outputs) use `deleted_at TIMESTAMPTZ` instead of hard DELETE. This preserves history, allows recovery, and avoids cascade issues. All queries must filter `WHERE deleted_at IS NULL`.

**`project_items` join table**
Outputs attach to projects via `project_items` rather than a direct `project_id` foreign key on outputs. This supports future phases where a single output can belong to multiple projects simultaneously. The `item_type` column allows future item types (documents, emails, tasks) to use the same join table without schema changes.

**`brand_context` is one row per org**
The `UNIQUE` constraint on `organization_id` enforces this. It is upserted, never duplicated. All AI generation prompts pull from this single row.

**`content_type_templates` seeded at migration time**
The three base templates (social-post, video-script, long-form) are inserted as part of this migration so they are available immediately after setup. New templates require a new migration — they are not admin-configurable by design (templates are structural, content types are admin-configurable).

**`updated_at` triggers**
Automatic triggers keep `updated_at` accurate without relying on application code to set it. This ensures the projects list (ordered by most recently updated) is always correct even when updates come from migrations or direct DB changes.

**RLS is not the only guard**
RLS policies are the database-level enforcement. Application queries also scope by `organization_id` explicitly as a second layer. Never rely on RLS alone — see `database.mdc`.
