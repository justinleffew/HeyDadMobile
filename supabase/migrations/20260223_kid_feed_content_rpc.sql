-- ALREADY APPLIED to production Supabase (2026-02-23).
--
-- This migration fixes the Kids Portal video feed, which was returning no content
-- because RLS policies on video_children, videos, and narrations tables block
-- unauthenticated (anon) reads. The kids portal does not use Supabase Auth —
-- kids enter an access code and get a local session in AsyncStorage, so all
-- Supabase queries run with the anon key and no auth.uid().
--
-- Two changes were made:
--
-- 1. Created a SECURITY DEFINER RPC function (get_kid_feed_content) that
--    fetches videos + narrations assigned to a child, bypassing table RLS.
--    The mobile feed.tsx now calls this RPC instead of querying tables directly.
--
-- 2. Added a storage policy on storage.objects to allow public/anon users to
--    SELECT (read) objects from the 'videos' bucket. This is needed so the
--    Supabase client can generate signed URLs for video files without being
--    authenticated. The audio and images buckets already had equivalent policies.

-- ============================================================================
-- 1. RPC function: get_kid_feed_content
-- ============================================================================

CREATE OR REPLACE FUNCTION get_kid_feed_content(p_child_id UUID)
RETURNS TABLE (
  id UUID,
  content_type TEXT,
  title TEXT,
  file_path TEXT,
  thumbnail_path TEXT,
  audio_path TEXT,
  image_path TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ,
  unlock_type TEXT,
  unlock_age TEXT,
  unlock_date DATE,
  unlock_milestone TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
BEGIN
  RETURN QUERY
  -- Videos assigned to this child via video_children join table
  SELECT
    v.id,
    'video'::TEXT,
    v.title,
    v.file_path,
    v.thumbnail_path,
    NULL::TEXT,
    v.narration_image_path,
    v.notes,
    v.created_at,
    v.unlock_type,
    v.unlock_age::TEXT,
    v.unlock_date,
    v.unlock_milestone
  FROM videos v
  INNER JOIN video_children vc ON vc.video_id = v.id
  WHERE vc.child_id = p_child_id

  UNION

  -- Narrations assigned via narration_children join table
  SELECT
    n.id,
    'audio'::TEXT,
    n.title,
    NULL::TEXT,
    NULL::TEXT,
    n.audio_path,
    n.image_path,
    n.notes,
    n.created_at,
    n.unlock_type,
    n.unlock_age,
    n.unlock_date,
    n.unlock_milestone
  FROM narrations n
  INNER JOIN narration_children nc ON nc.narration_id = n.id
  WHERE nc.child_id = p_child_id

  UNION

  -- Narrations assigned via selected_children jsonb column (fallback for older records)
  SELECT
    n.id,
    'audio'::TEXT,
    n.title,
    NULL::TEXT,
    NULL::TEXT,
    n.audio_path,
    n.image_path,
    n.notes,
    n.created_at,
    n.unlock_type,
    n.unlock_age,
    n.unlock_date,
    n.unlock_milestone
  FROM narrations n
  WHERE n.selected_children @> to_jsonb(ARRAY[p_child_id::TEXT])

  UNION

  -- Narrations assigned via child_ids uuid array column (another fallback)
  SELECT
    n.id,
    'audio'::TEXT,
    n.title,
    NULL::TEXT,
    NULL::TEXT,
    n.audio_path,
    n.image_path,
    n.notes,
    n.created_at,
    n.unlock_type,
    n.unlock_age,
    n.unlock_date,
    n.unlock_milestone
  FROM narrations n
  WHERE n.child_ids IS NOT NULL AND p_child_id = ANY(n.child_ids)

  ORDER BY created_at DESC;
END;
$fn$;

-- ============================================================================
-- 2. Storage policy: allow public/anon SELECT on videos bucket
-- ============================================================================
-- Note: This requires the postgres role to be a member of supabase_storage_admin.
-- The grant was also applied: GRANT supabase_storage_admin TO postgres;

CREATE POLICY "Kids can view videos"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'videos');
