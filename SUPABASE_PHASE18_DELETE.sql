-- Phase 18: delete contractor companies and remove badge photos. Safe to re-run.
-- A company can only be deleted when nothing refers to it; the app checks this first and the foreign keys enforce it too.

GRANT DELETE ON contractors TO authenticated;

DROP POLICY IF EXISTS contractors_delete ON contractors;
CREATE POLICY contractors_delete ON contractors FOR DELETE TO authenticated
  USING (can('manage_contractors'));

-- Clears the photo reference and returns the old path so the app can delete the file from storage.
CREATE OR REPLACE FUNCTION public.clear_badge_photo(p_badge_id UUID) RETURNS TEXT
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_old TEXT;
BEGIN
  IF NOT can_edit_badge_photo(p_badge_id::text) THEN
    RAISE EXCEPTION 'ไม่มีสิทธิ์ลบรูปของบัตรนี้';
  END IF;
  SELECT photo_path INTO v_old FROM badges WHERE id = p_badge_id;
  UPDATE badges SET photo_path = NULL WHERE id = p_badge_id;
  RETURN v_old;
END
$$;

REVOKE ALL ON FUNCTION public.clear_badge_photo(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.clear_badge_photo(UUID) TO authenticated;
