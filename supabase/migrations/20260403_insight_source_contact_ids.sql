-- Add source_contact_ids array to customer_insights for multi-contact attribution
-- Used when a consolidated pattern insight is shared by multiple survey respondents.

ALTER TABLE customer_insights
ADD COLUMN IF NOT EXISTS source_contact_ids UUID[] NOT NULL DEFAULT '{}';

-- Backfill: copy existing singular source_contact_id into the array where present
UPDATE customer_insights
SET source_contact_ids = ARRAY[source_contact_id]
WHERE source_contact_id IS NOT NULL AND source_contact_ids = '{}';
