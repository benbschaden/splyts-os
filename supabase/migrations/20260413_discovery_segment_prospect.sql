-- Add 'prospect' to discovery_entries.user_segment allowed values
ALTER TABLE public.discovery_entries
  DROP CONSTRAINT IF EXISTS discovery_entries_user_segment_check;

ALTER TABLE public.discovery_entries
  ADD CONSTRAINT discovery_entries_user_segment_check
  CHECK (user_segment IN ('new', 'active', 'power', 'churned', 'free', 'paid', 'prospect'));
