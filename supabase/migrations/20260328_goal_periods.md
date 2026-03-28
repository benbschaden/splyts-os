# Migration: goal_periods

## Summary
Replaces the single-row `current_goals` table with `goal_periods` (quarterly containers) and `period_goals` (individual trackable goals). Backfills existing data and drops the old table.

## Gherkin specs
- `docs/features/goal-periods.md`

## ADRs
- **Individual goals as rows, not JSONB**: each goal needs its own outcome status and carry-forward lineage. A JSONB array would make queries and updates cumbersome.
- **Strategic fields as text on goal_periods**: focus areas, what to push, what to defer are narrative — not trackable items. They stay as text columns on the period, not child rows.
- **Partial unique index for one-active-per-org**: `CREATE UNIQUE INDEX ... WHERE status = 'active'` enforces at the database level that only one period can be active at a time per organization.
- **Dropped current_goals entirely**: the backfill migrates all data, so the old table is no longer needed. Keeping it would create confusion about which is authoritative.

## Design notes
- `period_goals.carried_from_goal_id` is a self-referencing FK with `ON DELETE SET NULL` — if the original goal is deleted, the carry-forward link breaks gracefully rather than cascading.
- `outcome` is nullable — null means the period is still active and the goal hasn't been reviewed yet. The CHECK constraint limits it to `achieved`, `partial`, or `missed`.
- Backfill creates one goal per org with title "Key results (migrated)" containing the old free-text key results as the description. Users can split this into individual goals in the UI.
