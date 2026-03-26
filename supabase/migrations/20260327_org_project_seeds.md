# Migration: Org Project Seeds

**File:** `20260327_org_project_seeds.sql`
**Date:** 2026-03-27

## Summary

Adds the `org_project_seeds` table. Every row with `is_active = true` becomes a project automatically created for each new organisation at setup time. The project name, description, and order are stored here — not hardcoded in the application.

## Why

Consistent with ADR-001 (identity and defaults in the database, not in code). To change what projects new orgs receive, update this table. No code change required.

## Tables created

### `org_project_seeds`

| Column      | Type        | Notes                                              |
|-------------|-------------|----------------------------------------------------|
| id          | UUID PK     | Auto-generated                                     |
| name        | TEXT        | Project name to create                             |
| description | TEXT        | Optional project description                       |
| is_active   | BOOLEAN     | Only active seeds are applied to new orgs          |
| sort_order  | INTEGER     | Order in which projects are created                |
| created_at  | TIMESTAMPTZ | Auto-set                                           |

## Seed data

| name               | description                                                        |
|--------------------|--------------------------------------------------------------------|
| Marketing Content  | Default project for generating and managing marketing content across platforms. |

## RLS

- SELECT: public (any authenticated user) — needed at org creation time via service client
- INSERT / UPDATE / DELETE: not exposed (managed via migrations only)
