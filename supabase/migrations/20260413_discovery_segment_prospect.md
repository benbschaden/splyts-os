# Migration: discovery_segment_prospect

## Summary
Adds 'prospect' to the allowed values for `discovery_entries.user_segment`.

## Gherkin specs
- `docs/features/discovery-voice-analysis.md`

## Design notes
The existing CHECK constraint is dropped and recreated with the new value. No data migration needed — no existing rows use this value.
