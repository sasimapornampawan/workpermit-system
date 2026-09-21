-- Phase 12: worker photos on badges and QR verification. Safe to re-run.

ALTER TABLE badges
  ADD COLUMN IF NOT EXISTS photo_path TEXT,
  ADD COLUMN IF NOT EXISTS verify_token UUID NOT NULL DEFAULT gen_random_uuid();
CREATE UNIQUE INDEX IF NOT EXISTS badges_verify_token_key ON badges (verify_token);

-- ---------- Photos (private bucket, files at badge-photos/<badge id>/<random>.jpg) ----------

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('badge-photos', 'badge-photos', false, 2097152, ARRAY['image/jpeg', 'image/png'])
ON CONFLICT (id) DO UPDATE
  SET public = false, file_size_limit = EXCLUDED.file_size_limit, allowed_mime_types = EXCLUDED.allowed_mime_types;

CREATE OR REPLACE FUNCTION public.can_view_badge(p_badge_id TEXT) RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM badges b WHERE b.id::text = p_badge_id AND (
      my_role() IN ('safety', 'area_owner', 'manager')
      OR (my_role() = 'contractor' AND b.company = my_company())
    )
  )
$$;

CREATE OR REPLACE FUNCTION public.can_edit_badge_photo(p_badge_id TEXT) RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM badges b WHERE b.id::text = p_badge_id AND (
      my_role() = 'safety'
      OR (my_role() = 'contractor' AND b.company = my_company())
    )
  )
$$;

DROP POLICY IF EXISTS "badge photos read" ON storage.objects;
DROP POLICY IF EXISTS "badge photos upload" ON storage.objects;
DROP POLICY IF EXISTS "badge photos delete" ON storage.objects;
CREATE POLICY "badge photos read" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'badge-photos' AND public.can_view_badge((storage.foldername(name))[1]));
CREATE POLICY "badge photos upload" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'badge-photos' AND public.can_edit_badge_photo((storage.foldername(name))[1]));
CREATE POLICY "badge photos delete" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'badge-photos' AND public.can_edit_badge_photo((storage.foldername(name))[1]));

-- Contractors cannot update badges directly, so the photo is attached through this check. Returns the previous path.
CREATE OR REPLACE FUNCTION public.set_badge_photo(p_badge_id UUID, p_path TEXT) RETURNS TEXT
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_old TEXT;
BEGIN
  IF NOT can_edit_badge_photo(p_badge_id::text) THEN
    RAISE EXCEPTION 'ไม่มีสิทธิ์เปลี่ยนรูปของบัตรนี้';
  END IF;
  IF split_part(p_path, '/', 1) <> p_badge_id::text THEN
    RAISE EXCEPTION 'ที่อยู่ไฟล์รูปไม่ถูกต้อง';
  END IF;
  SELECT photo_path INTO v_old FROM badges WHERE id = p_badge_id;
  UPDATE badges SET photo_path = p_path WHERE id = p_badge_id;
  RETURN v_old;
END
$$;

REVOKE ALL ON FUNCTION public.set_badge_photo(UUID, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.set_badge_photo(UUID, TEXT) TO authenticated;

-- ---------- QR verification (public: scanned by gate guards without logging in) ----------
-- Returns only what is printed on the card plus its current status; never the ID number or photo.
CREATE OR REPLACE FUNCTION public.verify_badge(p_token UUID) RETURNS JSONB
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT jsonb_build_object(
    'name', b.name, 'company', b.company, 'card_no', b.card_no, 'tier', b.tier, 'kind', b.kind, 'role', b.role,
    'expiry', b.expiry, 'status', b.status, 'training', b.training, 'training_status', b.training_status,
    'perms', b.perms, 'contractor_status', c.status
  )
  FROM badges b LEFT JOIN contractors c ON c.name = b.company
  WHERE b.verify_token = p_token
$$;

REVOKE ALL ON FUNCTION public.verify_badge(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.verify_badge(UUID) TO anon, authenticated;
