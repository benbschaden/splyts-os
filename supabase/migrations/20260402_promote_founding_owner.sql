-- Promote the earliest admin in each organization to 'owner'.
-- This is the founding member — the person who created the org.

UPDATE organization_members
SET role = 'owner'
WHERE id IN (
  SELECT DISTINCT ON (organization_id) id
  FROM organization_members
  WHERE role = 'admin'
  ORDER BY organization_id, created_at ASC
);
