-- Add 'generated' status to outputs for content that has been generated but not yet
-- explicitly published by the user. Backfill existing rows where status = 'published'
-- but published_at is NULL (these were never actually published — just generated).

ALTER TABLE outputs
  DROP CONSTRAINT IF EXISTS outputs_status_check;

ALTER TABLE outputs
  ADD CONSTRAINT outputs_status_check
  CHECK (status IN ('draft', 'generated', 'published'));

UPDATE outputs
SET status = 'generated'
WHERE status = 'published'
  AND published_at IS NULL
  AND deleted_at IS NULL;
