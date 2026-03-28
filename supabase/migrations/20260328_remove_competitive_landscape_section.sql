-- Remove the competitive_landscape key from all existing business plan rows.
-- This field is now derived from the competitors table in the PDF pipeline
-- rather than being manually maintained as a free-text duplicate.

UPDATE business_plans
SET sections = sections - 'competitive_landscape'
WHERE sections ? 'competitive_landscape';
