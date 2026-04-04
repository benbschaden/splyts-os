-- ============================================================
-- Author Voice → User Profiles
-- ============================================================
-- 1. Add voice fields to user_profiles (each user owns their voice)
-- 2. Add author_user_id to content_ideas (replaces platform_owner)
-- 3. Drop platform_owner from content_ideas
-- 4. Drop author_profiles table entirely
-- ============================================================

-- 1. Voice fields on user_profiles
ALTER TABLE user_profiles
  ADD COLUMN IF NOT EXISTS voice            TEXT,
  ADD COLUMN IF NOT EXISTS tone             TEXT,
  ADD COLUMN IF NOT EXISTS writing_style    TEXT,
  ADD COLUMN IF NOT EXISTS personal_pillars TEXT,
  ADD COLUMN IF NOT EXISTS platform_notes   TEXT;

-- 2. Replace platform_owner with a nullable user reference
--    NULL = "Company" (brand voice, company page)
--    UUID = specific team member (their voice, their page)
ALTER TABLE content_ideas
  ADD COLUMN IF NOT EXISTS author_user_id UUID REFERENCES auth.users(id);

-- Existing rows: platform_owner='company' → author_user_id stays NULL (correct)
-- Existing rows: platform_owner='author'  → author_user_id also NULL
--   (no real user was ever linked; the old binary flag had no FK)
-- Nothing to backfill — all existing rows correctly default to NULL.

-- 3. Drop the now-redundant platform_owner column
--    (this also drops its inline CHECK constraint automatically)
ALTER TABLE content_ideas
  DROP COLUMN IF EXISTS platform_owner;

-- 4. Drop author_profiles (RLS policies and trigger drop automatically with the table)
DROP TABLE IF EXISTS author_profiles CASCADE;
