# 20260416 — Channel: TestFlight and UserJot

## Summary
Adds `testflight` and `userjot` as valid values for `contact_communications.channel` by dropping and recreating the CHECK constraint.

## Gherkin specs
- `docs/features/communication-channels-testflight-userjot.md`

## ADRs
- Channels are stored as unconstrained TEXT in the Supabase type layer but constrained via CHECK in SQL. Adding new channels only requires updating the CHECK constraint and the application-level TS union — no column type or schema restructure needed.

## Design notes
- The existing constraint is dropped and replaced rather than modified in-place, because PostgreSQL does not support `ALTER CONSTRAINT` for CHECK constraints.
- No data migration is needed — existing rows are unaffected; only new rows can use the new values.
