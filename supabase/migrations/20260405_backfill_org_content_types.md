# Migration: backfill_org_content_types

## Summary
Inserts one active `content_types` row per global template for every organization that currently has zero non-deleted content types.

## Gherkin specs
- Feature: Default content types for existing workspaces
  - Scenario: Org existed before auto-seed shipped
    - Given an organization with no content types
    - When this migration runs
    - Then the org receives one row per row in `content_type_templates`
    - And `created_by` is the earliest organization member by `created_at`

## ADRs
- Only orgs with **zero** existing content types are touched — orgs that already configured types are unchanged
- `created_by` uses the first member so the FK to `auth.users` is satisfied

## Design notes
- Idempotent for orgs that already have any content type (including partial manual setup)
- Orgs with no members are skipped (no valid `created_by`)
