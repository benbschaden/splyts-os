# Migration: project_type_and_dates

## Summary
Adds `project_type` ('project' | 'tool'), `start_date`, and `estimated_end_date` to the `projects` table. Backfills platform workspace projects (Marketing Content, Customer Discovery) as `tool` type. Adds `project_type` to `org_project_seeds` so future seeds control their own type.

## Gherkin specs supported
- `docs/features/feature-projects.md` — Tools appear separately from projects
- `docs/features/feature-projects.md` — Creating a project requires an estimated end date
- `docs/features/feature-projects.md` — Project card shows dates
- `docs/features/feature-projects.md` — Estimated end date is stored for tracking

## ADRs
- **project_type as a constrained TEXT column** — a CHECK constraint (`'project' | 'tool'`) keeps it simple and avoids a separate enum type. Enums in Postgres are harder to extend; TEXT with a check is easier to add new types to in a future migration.
- **estimated_end_date nullable in DB** — existing projects have no end date. Making it NOT NULL would require a migration default, but a date default doesn't make sense for arbitrary historical projects. The app layer enforces it for new project creation going forward.
- **Backfill by name** — existing seeded tool projects are matched by their standardised names ('Marketing Content', 'Customer Discovery'). These names are stable and known. If an organisation also named a user project identically, marking it as a tool is low-risk since the distinction is cosmetic in the current release.

## Design notes
- Tools are platform workspaces: persistent, no timeline, not user-creatable. They are seeded automatically when an org is set up.
- Projects are user-created with a finite scope. `estimated_end_date` is required in the new project form to build an estimation dataset.
- The index on `(organization_id, project_type) WHERE deleted_at IS NULL` makes the tool/project split query fast.
- No `actual_end_date` column yet — if needed later, it can be added when a project-completion flow is built.
