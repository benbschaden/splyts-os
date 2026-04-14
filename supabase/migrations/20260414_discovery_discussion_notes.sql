-- Add discussion_notes to discovery_entries
-- Stores the saved AI discussion transcript for an entry.
ALTER TABLE public.discovery_entries
  ADD COLUMN IF NOT EXISTS discussion_notes TEXT;
