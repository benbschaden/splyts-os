-- Migration: Add created_by to content_index for activity reporting.
-- Tracks who created each indexed content item.

ALTER TABLE content_index ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id);

CREATE INDEX IF NOT EXISTS content_index_created_by_idx
  ON content_index (created_by, created_at);
