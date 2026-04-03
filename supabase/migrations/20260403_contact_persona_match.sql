-- Add persona matching columns to contacts
-- Stores the AI-matched persona, match score (0-100), reasoning, and when it was last assessed.
-- persona_id is nullable — contacts start unmatched.
-- ON DELETE SET NULL: if a persona is deleted, the match clears rather than breaking contacts.

ALTER TABLE contacts
  ADD COLUMN IF NOT EXISTS persona_id UUID REFERENCES personas(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS persona_match_score SMALLINT
    CHECK (persona_match_score IS NULL OR (persona_match_score >= 0 AND persona_match_score <= 100)),
  ADD COLUMN IF NOT EXISTS persona_match_reasoning TEXT,
  ADD COLUMN IF NOT EXISTS persona_matched_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS contacts_persona_idx ON contacts (persona_id)
  WHERE deleted_at IS NULL AND persona_id IS NOT NULL;
