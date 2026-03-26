# Migration: 20260326_fix_org_members_rls

## Summary
Fixes the `org_members_select` RLS policy on `organization_members` which was self-referencing and always returned no rows.

## Design notes
The original policy checked `organization_id IN (SELECT organization_id FROM organization_members WHERE user_id = auth.uid())` — querying `organization_members` from within an `organization_members` policy. Postgres evaluates the inner subquery under the same RLS restrictions as the outer query, creating a circular dependency that resolves to an empty set. The fix uses `user_id = auth.uid()` directly, which is non-circular and correct for V1 (each user reads only their own membership rows).
