-- ============================================================
-- Customer Hub: SaaS-focused segments
-- ============================================================
-- 1. Replace the contacts.segment check constraint with SaaS
--    user segments (removes investor/partner, adds free_user
--    and power_user).
-- 2. Add source_segment to customer_insights so insights can be
--    attributed to a whole segment (e.g. "from beta users")
--    rather than only to a specific individual.
-- ============================================================

-- -------------------------------------------------------
-- 1. contacts.segment — replace constraint
-- -------------------------------------------------------

ALTER TABLE public.contacts
  DROP CONSTRAINT IF EXISTS contacts_segment_check;

ALTER TABLE public.contacts
  ADD CONSTRAINT contacts_segment_check
  CHECK (segment IN ('beta_user','free_user','customer','power_user','prospect','churned','other'));

-- Null out any values that no longer fit (investor/partner)
UPDATE public.contacts
SET segment = NULL
WHERE segment IN ('investor', 'partner');

-- -------------------------------------------------------
-- 2. customer_insights.source_segment
-- -------------------------------------------------------

ALTER TABLE public.customer_insights
  ADD COLUMN IF NOT EXISTS source_segment TEXT
  CHECK (source_segment IN ('beta_user','free_user','customer','power_user','prospect','churned','other'));

CREATE INDEX IF NOT EXISTS customer_insights_source_segment_idx
  ON public.customer_insights (organization_id, source_segment)
  WHERE deleted_at IS NULL;
