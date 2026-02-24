-- Migration: Kid notes table, bookmark table, parent profile RPC, and access code length fix
--
-- This migration adds:
-- 1. kid_notes table — lets kids write notes about stories in the feed
-- 2. kid_bookmarks table — lets kids bookmark/favorite stories
-- 3. save_kid_note RPC (SECURITY DEFINER) — saves a note bypassing RLS
-- 4. get_kid_notes RPC (SECURITY DEFINER) — fetches notes for a memory
-- 5. delete_kid_note RPC (SECURITY DEFINER) — deletes a note
-- 6. save_kid_bookmark / remove_kid_bookmark / get_kid_bookmarks RPCs
-- 7. get_parent_display_name RPC — fetches parent name for kid feed UI
-- 8. Access code length fix — regenerates any 8-char codes to 6-char codes
--
-- All RPCs use SECURITY DEFINER because kids are unauthenticated (anon key).

-- ============================================================================
-- 1. kid_notes table
-- ============================================================================

CREATE TABLE IF NOT EXISTS kid_notes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  memory_id UUID NOT NULL,
  child_id UUID NOT NULL REFERENCES children(id) ON DELETE CASCADE,
  note_text TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_kid_notes_child_memory ON kid_notes(child_id, memory_id);

-- RLS: block all direct access (use RPCs instead)
ALTER TABLE kid_notes ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- 2. kid_bookmarks table
-- ============================================================================

CREATE TABLE IF NOT EXISTS kid_bookmarks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  memory_id UUID NOT NULL,
  child_id UUID NOT NULL REFERENCES children(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(child_id, memory_id)
);

CREATE INDEX IF NOT EXISTS idx_kid_bookmarks_child ON kid_bookmarks(child_id);

ALTER TABLE kid_bookmarks ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- 3. Notes RPCs
-- ============================================================================

CREATE OR REPLACE FUNCTION save_kid_note(
  p_child_id UUID,
  p_memory_id UUID,
  p_note_text TEXT
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_note_id UUID;
BEGIN
  INSERT INTO kid_notes (memory_id, child_id, note_text)
  VALUES (p_memory_id, p_child_id, p_note_text)
  RETURNING id INTO v_note_id;
  RETURN v_note_id;
END;
$$;

CREATE OR REPLACE FUNCTION get_kid_notes(
  p_child_id UUID,
  p_memory_id UUID
)
RETURNS TABLE(id UUID, note_text TEXT, created_at TIMESTAMPTZ)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT kn.id, kn.note_text, kn.created_at
  FROM kid_notes kn
  WHERE kn.child_id = p_child_id AND kn.memory_id = p_memory_id
  ORDER BY kn.created_at DESC;
END;
$$;

CREATE OR REPLACE FUNCTION delete_kid_note(
  p_child_id UUID,
  p_note_id UUID
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM kid_notes
  WHERE id = p_note_id AND child_id = p_child_id;
END;
$$;

-- ============================================================================
-- 4. Bookmarks RPCs
-- ============================================================================

CREATE OR REPLACE FUNCTION save_kid_bookmark(
  p_child_id UUID,
  p_memory_id UUID
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id UUID;
BEGIN
  INSERT INTO kid_bookmarks (child_id, memory_id)
  VALUES (p_child_id, p_memory_id)
  ON CONFLICT (child_id, memory_id) DO NOTHING
  RETURNING id INTO v_id;
  RETURN v_id;
END;
$$;

CREATE OR REPLACE FUNCTION remove_kid_bookmark(
  p_child_id UUID,
  p_memory_id UUID
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM kid_bookmarks
  WHERE child_id = p_child_id AND memory_id = p_memory_id;
END;
$$;

CREATE OR REPLACE FUNCTION get_kid_bookmarks(
  p_child_id UUID
)
RETURNS TABLE(memory_id UUID)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT kb.memory_id
  FROM kid_bookmarks kb
  WHERE kb.child_id = p_child_id
  ORDER BY kb.created_at DESC;
END;
$$;

-- ============================================================================
-- 5. Parent display name RPC
-- ============================================================================

CREATE OR REPLACE FUNCTION get_parent_display_name(p_parent_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_name TEXT;
BEGIN
  SELECT COALESCE(p.display_name, p.full_name, 'Dad')
  INTO v_name
  FROM profiles p
  WHERE p.id = p_parent_id;
  RETURN COALESCE(v_name, 'Dad');
END;
$$;

-- ============================================================================
-- 6. Access code length fix
-- ============================================================================
-- The web app was generating 8-character access codes while mobile generates
-- 6-character codes. Mobile code entry only accepts 6 characters. This
-- regenerates any codes longer than 6 characters using the same alphabet:
-- "23456789ABCDEFGHJKLMNPQRSTUVWXYZ"
--
-- The function generates a random 6-char code from this alphabet.

CREATE OR REPLACE FUNCTION generate_access_code_6()
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  alphabet TEXT := '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
  result TEXT := '';
  i INT;
BEGIN
  FOR i IN 1..6 LOOP
    result := result || substr(alphabet, floor(random() * length(alphabet) + 1)::INT, 1);
  END LOOP;
  RETURN result;
END;
$$;

-- Update all access codes that are longer than 6 characters
-- (these were generated by the web app with 8-char length)
DO $$
DECLARE
  r RECORD;
  new_code TEXT;
  collision BOOLEAN;
BEGIN
  FOR r IN SELECT id FROM children WHERE length(access_code) > 6 LOOP
    collision := TRUE;
    WHILE collision LOOP
      new_code := generate_access_code_6();
      -- Check for uniqueness
      SELECT EXISTS(
        SELECT 1 FROM children WHERE access_code = new_code AND id != r.id
      ) INTO collision;
    END LOOP;
    UPDATE children SET access_code = new_code WHERE id = r.id;
  END LOOP;
END;
$$;

-- Clean up the helper function
DROP FUNCTION IF EXISTS generate_access_code_6();
