-- ============================================================
-- Migration: get_auth_user_by_email function
-- Replaces delete_unconfirmed_user_by_email. auth.users is not
-- accessible via PostgREST, so this SECURITY DEFINER function
-- queries it from within the DB and returns the user ID and
-- confirmation status. The actual deletion is done via
-- db.auth.admin.deleteUser() in the API route (correct Supabase way).
-- ============================================================

CREATE OR REPLACE FUNCTION get_auth_user_by_email(p_email TEXT)
RETURNS TABLE (user_id UUID, is_confirmed BOOLEAN)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    id AS user_id,
    (email_confirmed_at IS NOT NULL) AS is_confirmed
  FROM auth.users
  WHERE lower(email) = lower(p_email)
  LIMIT 1;
END;
$$;

-- Only the service role (used by the invite API) should call this
REVOKE ALL ON FUNCTION get_auth_user_by_email(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION get_auth_user_by_email(TEXT) TO service_role;
