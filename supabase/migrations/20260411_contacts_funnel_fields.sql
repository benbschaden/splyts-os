-- Add funnel lifecycle tracking columns to contacts.
-- Enables the computed funnel strip in Customer Hub and
-- prepares the schema for webhook-driven auto-population
-- from Tally, Loops, and the Splyts app (Phases 2–4).

ALTER TABLE public.contacts
  ADD COLUMN funnel_stage TEXT
    CHECK (funnel_stage IN ('signup', 'form_completed', 'downloaded', 'first_session', 'activated')),
  ADD COLUMN acquisition_source TEXT,
  ADD COLUMN funnel_stage_updated_at TIMESTAMPTZ,
  ADD COLUMN first_session_at TIMESTAMPTZ,
  ADD COLUMN activated_at TIMESTAMPTZ,
  ADD COLUMN tally_submission_id TEXT UNIQUE,
  ADD COLUMN loops_contact_id TEXT UNIQUE;

-- Fast per-org stage counts — used by the funnel strip query.
CREATE INDEX contacts_org_funnel_idx
  ON public.contacts (organization_id, funnel_stage)
  WHERE deleted_at IS NULL;

-- Supports week-over-week activated count queries.
CREATE INDEX contacts_org_activated_idx
  ON public.contacts (organization_id, activated_at)
  WHERE deleted_at IS NULL AND activated_at IS NOT NULL;
