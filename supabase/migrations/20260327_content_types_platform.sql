-- Add platform and cadence fields to content_types
-- platform: connects a content type to a specific publishing platform (e.g. LinkedIn, Twitter/X)
-- cadence: how often content of this type is posted (e.g. "3x per week", "daily")
ALTER TABLE content_types ADD COLUMN IF NOT EXISTS platform TEXT;
ALTER TABLE content_types ADD COLUMN IF NOT EXISTS cadence TEXT;
