-- Add platform field to content_types
-- Connects a content type to a specific platform guideline during generation
ALTER TABLE content_types ADD COLUMN platform TEXT;
