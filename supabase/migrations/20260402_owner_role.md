# Migration: Owner Role

## Summary
Adds `'owner'` to the `member_role` enum. Owner is a superset of admin with exclusive access to business plan editing and activity reports.

## Gherkin specs
- `docs/features/owner-role.md`

## Design notes
- Added BEFORE 'admin' so enum ordering is owner > admin > member
- No data migration needed — the org owner should update their role to 'owner' manually or via a seed script
- All existing `role === 'admin'` checks are updated in application code to use `isAtLeastAdmin()` which returns true for both 'owner' and 'admin'
