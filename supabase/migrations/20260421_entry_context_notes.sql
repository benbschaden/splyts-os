-- Free-form researcher notes on a discovery entry.
-- Use this to capture participant context like relationship (friend, prospect, power user),
-- how the session was conducted, known biases, or any other metadata not covered by
-- the structured fields.

ALTER TABLE discovery_entries
  ADD COLUMN IF NOT EXISTS context_notes TEXT;
