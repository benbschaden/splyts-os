-- ============================================================
-- Migration: add model_id to outputs
-- Records which AI model was used for each generation.
-- ============================================================

ALTER TABLE outputs
  ADD COLUMN model_id TEXT NOT NULL DEFAULT 'claude-opus-4-5';
