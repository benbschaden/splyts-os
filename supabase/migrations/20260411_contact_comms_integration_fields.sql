-- Add integration tracking columns to contact_communications.
-- message_id: RFC2822 Message-ID header — deduplicates Resend inbound captures on retry.
-- loops_email_id: Loops email.id — links sent records to their open/click/bounce events.
-- metadata: JSONB envelope for engagement data (opened_at, clicked_at, delivered_at, bounced).

ALTER TABLE public.contact_communications
  ADD COLUMN message_id TEXT,
  ADD COLUMN loops_email_id TEXT,
  ADD COLUMN metadata JSONB NOT NULL DEFAULT '{}';

-- Unique index prevents double-insert when Resend retries the inbound webhook.
CREATE UNIQUE INDEX contact_comms_message_id_uidx
  ON public.contact_communications (message_id)
  WHERE message_id IS NOT NULL AND deleted_at IS NULL;

-- Non-unique index for looking up a record by Loops email ID to attach engagement events.
CREATE INDEX contact_comms_loops_email_id_idx
  ON public.contact_communications (loops_email_id)
  WHERE loops_email_id IS NOT NULL;
