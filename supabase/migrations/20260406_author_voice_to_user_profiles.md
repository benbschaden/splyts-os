# Migration: Author Voice → User Profiles

**File:** `20260406_author_voice_to_user_profiles.sql`
**Date:** 2026-04-06

## Summary

Moves voice profile fields from the admin-managed `author_profiles` table into `user_profiles` (self-managed per user). Replaces the binary `content_ideas.platform_owner` ('company'|'author') with `author_user_id` (nullable UUID), unifying the "where to publish" and "whose voice" concepts into one selection. Drops `author_profiles` entirely.

## Design notes

- `user_profiles.voice/tone/writing_style/personal_pillars/platform_notes` — all nullable; users fill these in at their own pace in Settings → Profile.
- `content_ideas.author_user_id` — NULL means "Company" (brand voice, company page). A UUID references the specific team member whose voice and page the content is for.
- Existing `platform_owner = 'author'` rows had no FK to a real user, so they safely become `author_user_id = NULL` (treated as Company). No data is silently misrepresented.
- `author_profiles` table is dropped with CASCADE. Any FK references from other tables would also drop — there are none.

## Data loss

The existing rows in `author_profiles` are permanently deleted. Team members must re-enter their voice data in Settings → Profile after deployment.
