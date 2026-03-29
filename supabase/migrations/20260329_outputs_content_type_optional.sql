-- Allow outputs without a content type.
-- Project deliverables (briefs, reports, analyses, etc.) are not marketing
-- content types — they belong to a project but not to any content_types row.
ALTER TABLE outputs ALTER COLUMN content_type_id DROP NOT NULL;
