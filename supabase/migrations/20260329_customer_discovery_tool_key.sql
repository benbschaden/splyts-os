-- ============================================================
-- Customer Discovery tool_key
-- ============================================================
-- Assigns tool_key = 'customer_discovery' to the Customer
-- Discovery seed and all existing Customer Discovery projects
-- so ProjectDetail can render a dedicated view (bypassing
-- the generic Content tab that confused users).
-- ============================================================

UPDATE public.org_project_seeds
SET tool_key = 'customer_discovery'
WHERE name = 'Customer Discovery';

UPDATE public.projects
SET tool_key = 'customer_discovery'
WHERE name = 'Customer Discovery'
  AND project_type = 'tool'
  AND deleted_at IS NULL;
