-- Add category to org_project_seeds so seed projects are created with a category
ALTER TABLE org_project_seeds ADD COLUMN IF NOT EXISTS category TEXT;

-- Assign the existing Marketing Content seed to the Marketing category
UPDATE org_project_seeds SET category = 'Marketing' WHERE name = 'Marketing Content';

-- Backfill any already-created projects that came from this seed and have no category
UPDATE projects SET category = 'Marketing'
WHERE name = 'Marketing Content'
  AND category IS NULL;
