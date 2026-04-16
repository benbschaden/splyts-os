-- Extend the contact_communications channel enum to include TestFlight and UserJot.
-- These are first-party mobile/feedback channels used for beta testing (TestFlight)
-- and in-app user feedback widgets (UserJot).

ALTER TABLE public.contact_communications
  DROP CONSTRAINT IF EXISTS contact_communications_channel_check;

ALTER TABLE public.contact_communications
  ADD CONSTRAINT contact_communications_channel_check
  CHECK (channel IN ('email','call','meeting','chat','sms','testflight','userjot','other'));
