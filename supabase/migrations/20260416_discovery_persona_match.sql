ALTER TABLE discovery_entries
  ADD COLUMN IF NOT EXISTS persona_id UUID REFERENCES personas(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS persona_match_score INTEGER,
  ADD COLUMN IF NOT EXISTS persona_match_reasoning TEXT,
  ADD COLUMN IF NOT EXISTS persona_matched_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS discovery_entries_persona_id_idx ON discovery_entries (persona_id);
