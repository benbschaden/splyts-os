# Migration: company_milestones

Creates the `company_milestones` table — dated company-level milestones shown on a timeline.

**Key fields:** `title`, `description`, `milestone_date` (DATE), `category` (fundraising/hiring/launch/revenue/partnership/product/other), `status` (planned/achieved/missed/pushed).

**RLS:** org members can view; only admins can create/edit/delete. Soft deletes via `deleted_at`.

**Index:** `(organization_id, milestone_date)` WHERE `deleted_at IS NULL` for chronological timeline queries.
