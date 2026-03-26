# Migration: User Profiles

**File:** `20260327_user_profiles.sql`
**Date:** 2026-03-27

## Summary

Adds the `user_profiles` table for personal profile data (full name, role, avatar) and creates the `avatars` Supabase Storage bucket for profile picture uploads. Profiles are scoped per user, not per organisation.

## Tables created

### `user_profiles`

| Column     | Type        | Notes                                        |
|------------|-------------|----------------------------------------------|
| id         | UUID PK/FK  | References auth.users, cascade delete        |
| full_name  | TEXT        | Optional display name                        |
| role       | TEXT        | Optional job title                           |
| avatar_url | TEXT        | Public URL from Supabase Storage             |
| created_at | TIMESTAMPTZ | Auto-set                                     |
| updated_at | TIMESTAMPTZ | Auto-updated via trigger                     |

## Storage

Creates the `avatars` bucket (public, 2MB limit, images only). Files are stored at path `{user_id}/{filename}` so RLS policies can restrict uploads to the owning user.

## RLS

### user_profiles
- SELECT own: `id = auth.uid()`
- SELECT org members: users in the same org can read each other's profiles
- INSERT: own only
- UPDATE: own only

### storage.objects (avatars bucket)
- INSERT: own folder only (`{uid}/...`)
- UPDATE: own folder only
- SELECT: public
- DELETE: own folder only

## Design notes

- Profile is created lazily on first save — no row exists until the user saves their profile for the first time
- `avatar_url` stores the full public URL returned by Supabase Storage after upload
- 2MB file size limit keeps storage costs low for early stage
