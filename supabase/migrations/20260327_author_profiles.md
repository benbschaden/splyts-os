# Migration: Author Profiles

**File:** `20260327_author_profiles.sql`
**Date:** 2026-03-27

## Summary

Adds the `author_profiles` table to support per-person voice profiles for AI content generation. Each profile is scoped to an organisation with no row limit. The "Company" option at generation time reads from `brand_context` directly — no author profile row is needed for it.

## Gherkin spec

See `docs/features/feature-author-profiles.md`

## Tables created

### `author_profiles`

| Column            | Type        | Notes                                      |
|-------------------|-------------|--------------------------------------------|
| id                | UUID PK     | Auto-generated                             |
| organization_id   | UUID FK     | References organizations, cascade delete   |
| name              | TEXT        | Required — display name for the author     |
| role              | TEXT        | Optional — e.g. "Co-founder", "CMO"        |
| voice             | TEXT        | Optional — e.g. "Direct, curious"          |
| tone              | TEXT        | Optional — e.g. "Conversational but sharp" |
| writing_style     | TEXT        | Optional — free-form style notes           |
| personal_pillars  | TEXT        | Optional — author's own content themes     |
| platform_notes    | TEXT        | Optional — platform-specific behaviours    |
| created_by        | UUID FK     | References auth.users                      |
| created_at        | TIMESTAMPTZ | Auto-set                                   |
| updated_at        | TIMESTAMPTZ | Auto-updated via trigger                   |
| deleted_at        | TIMESTAMPTZ | Soft delete — NULL means active            |

## Design notes

- **Soft delete:** `deleted_at` is used so deleted authors do not appear in generation dropdowns but historical output records can still reference an author ID without a broken FK.
- **Only name is required:** All voice/style fields are optional so an author can be created with just a name and filled in over time.
- **No inheritance from brand_context:** Authors are fully independent. The AI prompt assembles brand context + author profile at generation time.
- **Service client used for all queries:** All server-side queries bypass RLS via the service client, consistent with the rest of the codebase pattern.

## RLS

- SELECT: any org member
- INSERT / UPDATE / DELETE: admin only
