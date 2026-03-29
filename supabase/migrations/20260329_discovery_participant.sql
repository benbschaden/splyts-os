-- ============================================================
-- Discovery Participant
-- ============================================================
-- Adds a participant TEXT column to discovery_entries so that
-- multiple entries from the same person (e.g. a beta user's
-- emails across several weeks) can be grouped and filtered.
-- Enables the "Chat about James" participant-scoped AI chat.
-- ============================================================

ALTER TABLE public.discovery_entries
  ADD COLUMN participant TEXT;

CREATE INDEX discovery_entries_participant_idx
  ON public.discovery_entries (project_id, participant)
  WHERE deleted_at IS NULL AND participant IS NOT NULL;
