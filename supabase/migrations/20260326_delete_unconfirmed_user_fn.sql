-- ============================================================
-- Migration: delete_unconfirmed_user_by_email function
-- Allows the invite API to remove ghost auth users (invited but
-- never confirmed) so they can be re-invited cleanly.
-- auth.users is not accessible via PostgREST, so this function
-- runs with SECURITY DEFINER to query it from within the DB.
-- ============================================================

CREATE OR REPLACE FUNCTION delete_unconfirmed_user_by_email(p_email TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id            UUID;
  v_email_confirmed_at TIMESTAMPTZ;
BEGIN
  SELECT id, email_confirmed_at
  INTO v_user_id, v_email_confirmed_at
  FROM auth.users
  WHERE lower(email) = lower(p_email)
  LIMIT 1;

  IF v_user_id IS NULL THEN
    RETURN 'not_found';
  END IF;

  -- Do not delete users who have confirmed their email — they have a real account
  IF v_email_confirmed_at IS NOT NULL THEN
    RETURN 'confirmed';
  END IF;

  DELETE FROM auth.users WHERE id = v_user_id;
  RETURN 'deleted';
END;
$$;

-- Only the service role (used by the invite API) should call this
REVOKE ALL ON FUNCTION delete_unconfirmed_user_by_email(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION delete_unconfirmed_user_by_email(TEXT) TO service_role;
