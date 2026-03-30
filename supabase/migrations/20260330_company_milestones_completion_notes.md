# Migration: company_milestones completion_notes

## Summary

Adds nullable `completion_notes` on `company_milestones` for text saved when marking a milestone as achieved (quick "Mark done" flow or full edit).

## Gherkin specs

See `docs/features/company-milestones-mark-done.md`.

## ADRs

- Notes are separate from `description` (planning/context) so completion context can be recorded without overwriting the original brief.

## Design notes

- No backfill; existing rows have `NULL` completion notes.
