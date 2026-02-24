-- Fix case-sensitive access code matching.
--
-- Problem: The web app generates access codes with mixed case (upper + lower),
-- but the mobile app normalizes input to UPPERCASE. The validate_kid_access_code
-- RPC does a case-sensitive comparison (WHERE access_code = code_input), so
-- web-generated codes with lowercase letters can never be matched from mobile.
--
-- Fix:
-- 1. Recreate validate_kid_access_code with UPPER() on both sides
-- 2. Uppercase all existing access codes in the children table
--
-- After this migration, all codes are uppercase in the DB and all future
-- lookups are case-insensitive, so it works regardless of what the web sends.

-- ============================================================================
-- 1. Normalize all existing access codes to uppercase
-- ============================================================================

UPDATE children
SET access_code = UPPER(access_code)
WHERE access_code IS NOT NULL
  AND access_code != UPPER(access_code);

-- ============================================================================
-- 2. Recreate validate_kid_access_code with case-insensitive matching
-- ============================================================================
-- This replaces the existing function (originally from the web repo migration).
-- The only change is: WHERE UPPER(c.access_code) = UPPER(p_code)
-- so lookups are case-insensitive regardless of what's stored or sent.

CREATE OR REPLACE FUNCTION validate_kid_access_code(code_input TEXT)
RETURNS TABLE (
  kid_id UUID,
  kid_name TEXT,
  parent_id UUID,
  birthdate DATE
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    c.id AS kid_id,
    c.name AS kid_name,
    c.user_id AS parent_id,
    c.birthdate
  FROM children c
  WHERE UPPER(c.access_code) = UPPER(code_input);
END;
$$;
