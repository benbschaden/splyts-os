-- Add summary column to outputs for future RAG / semantic search.
-- Nullable so existing rows are unaffected.
ALTER TABLE outputs ADD COLUMN IF NOT EXISTS summary TEXT;
