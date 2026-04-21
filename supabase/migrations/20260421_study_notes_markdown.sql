ALTER TABLE discovery_studies
  ADD COLUMN IF NOT EXISTS notes_markdown TEXT;
