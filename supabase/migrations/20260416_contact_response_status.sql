-- Add AI-driven response tracking to contacts.
-- response_status: whether this contact's thread is awaiting a reply.
-- response_status_reason: one-sentence AI-generated explanation for the flag.
-- response_status_updated_at: when the status was last set (by AI or manually).

ALTER TABLE public.contacts
  ADD COLUMN IF NOT EXISTS response_status TEXT
    CHECK (response_status IN ('needs_response', 'no_action_needed', 'in_progress'))
    DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS response_status_reason TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS response_status_updated_at TIMESTAMPTZ DEFAULT NULL;

CREATE INDEX contacts_response_status_org_idx
  ON public.contacts (organization_id, response_status)
  WHERE deleted_at IS NULL AND response_status IS NOT NULL;
