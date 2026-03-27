-- ============================================================
-- Add model_id and browser context to chat_sessions
-- ============================================================
-- Adds per-session model selection and browser tool toggle.
-- Backfills existing rows so context_config includes browser: false.
-- ============================================================

ALTER TABLE chat_sessions
  ADD COLUMN model_id TEXT NOT NULL DEFAULT 'claude-opus-4-5';

-- Update context_config default to include browser flag
ALTER TABLE chat_sessions
  ALTER COLUMN context_config SET DEFAULT '{"brand": true, "business_plan": false, "personas": false, "browser": false}'::jsonb;

-- Backfill existing rows: merge browser: false into any config that doesn't have it
UPDATE chat_sessions
  SET context_config = context_config || '{"browser": false}'::jsonb
  WHERE context_config -> 'browser' IS NULL;
