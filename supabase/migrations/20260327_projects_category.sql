-- Add category column to projects for departmental grouping
ALTER TABLE projects ADD COLUMN category TEXT;

CREATE INDEX projects_org_category_idx ON projects (organization_id, category)
  WHERE deleted_at IS NULL;
