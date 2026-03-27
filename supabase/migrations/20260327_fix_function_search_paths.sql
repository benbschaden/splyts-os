-- Fix mutable search_path on trigger functions.
-- Setting search_path = '' prevents search path hijacking attacks by ensuring
-- the function cannot be influenced by the caller's search_path setting.

CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- update_updated_at_column was created directly in the database without a
-- migration. Re-creating it here with the same body and the fixed search_path
-- so it is both secure and tracked in migration history.
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;
