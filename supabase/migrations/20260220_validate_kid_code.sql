-- RPC function to validate kid access codes.
-- Uses SECURITY DEFINER to bypass RLS on the children table,
-- so the anon key (used by the mobile app) can validate codes
-- without needing a SELECT policy on the entire children table.
--
-- Run this in the Supabase SQL Editor (Dashboard → SQL Editor → New query).

CREATE OR REPLACE FUNCTION validate_kid_code(code_input TEXT)
RETURNS TABLE(kid_id UUID, kid_name TEXT, parent_id UUID, birthdate DATE) AS $$
BEGIN
  RETURN QUERY
  SELECT c.id, c.name, c.user_id, c.birthdate
  FROM children c
  WHERE c.access_code = upper(trim(code_input))
  LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute to anon and authenticated roles so both can call it
GRANT EXECUTE ON FUNCTION validate_kid_code(TEXT) TO anon;
GRANT EXECUTE ON FUNCTION validate_kid_code(TEXT) TO authenticated;
