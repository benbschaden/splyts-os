# Migration: project_sharing

**Summary:** Adds teams, project-level sharing with granular visibility (organization / team / specific users / private), and seeds default B2C SaaS teams for new orgs.

## Gherkin specs supported

- `docs/features/project-sharing.md` — all scenarios

## Tables created

| Table | Purpose |
|---|---|
| `teams` | Org-level team definitions (Product, Engineering, etc.) |
| `team_members` | Which org users belong to each team |
| `project_teams` | Which teams have access to a project (used when `visibility = 'team'`) |
| `project_members` | Which specific users have access to a project (used when `visibility = 'specific_users'`) |
| `org_team_seeds` | Default team names seeded at org creation time |

## Schema changes

### `projects.visibility`

Old constraint: `CHECK (visibility IN ('private', 'shared'))`  
New constraint: `CHECK (visibility IN ('private', 'organization', 'team', 'specific_users'))`  
Default changed from `'shared'` to `'organization'`  
Existing `'shared'` rows are renamed to `'organization'`

### RLS rewrites

**`projects_select`** — four-branch logic:
1. `organization` → any org member can see it
2. `private` → only the creator
3. `team` → creator always; others must be in a team that has access via `project_teams`
4. `specific_users` → creator always; others must be in `project_members`

**`projects_update`** — changed from admin-only to creator OR admin. This enables project creators to edit their own project's sharing settings regardless of their role.

## ADRs

- **Creator controls sharing**: The project creator can always see and edit their own project's sharing regardless of org role. This is intentional — sharing is a per-project configuration, not a global admin permission.
- **Clean replace model for team/member lists**: When sharing is updated, all existing `project_teams` or `project_members` rows are deleted and replaced. No partial updates.
- **Creator always has access**: For `team` and `specific_users` visibility, the creator always has access even if they didn't add themselves to the access list. This prevents creators from accidentally locking themselves out.
- **Teams are org-wide**: Teams are managed by admins (creation, membership). Any org member can read team membership (needed to show the picker in the UI and to evaluate project access).

## Design notes

- `org_team_seeds` follows the same pattern as `org_project_seeds` — a config table that drives seeding at org creation time, not hardcoded in application code.
- The B2C SaaS default teams (Product, Engineering, Design, Growth, Marketing, Customer Success, Data & Analytics, Operations, Finance, People) were chosen to cover the typical cross-functional structure of a growth-stage SaaS company.
- `project_teams` and `project_members` use ON DELETE CASCADE so cleanup is automatic when a project or team is deleted.
- `teams` has a `deleted_at` column for soft deletes, consistent with other tables.
