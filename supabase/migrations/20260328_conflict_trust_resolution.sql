-- Migration: Conflict trust resolution
-- Adds trusted_file_id and trusted_excerpt to company_knowledge_conflicts
-- so admins can pick which version of a conflict to use as the source of truth.

ALTER TABLE company_knowledge_conflicts
  ADD COLUMN trusted_file_id UUID REFERENCES company_knowledge_files(id),
  ADD COLUMN trusted_excerpt  TEXT;
