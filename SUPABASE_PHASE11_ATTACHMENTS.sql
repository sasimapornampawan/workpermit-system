-- Phase 11: permit file attachments stored in Supabase Storage. Safe to re-run.

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('permit-files', 'permit-files', false, 10485760, ARRAY['application/pdf', 'image/jpeg', 'image/png'])
ON CONFLICT (id) DO UPDATE
  SET public = false, file_size_limit = EXCLUDED.file_size_limit, allowed_mime_types = EXCLUDED.allowed_mime_types;

CREATE TABLE IF NOT EXISTS permit_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  permit_id UUID NOT NULL REFERENCES permits(id) ON DELETE CASCADE,
  kind TEXT NOT NULL,
  file_path TEXT NOT NULL UNIQUE,
  file_name TEXT NOT NULL,
  size INTEGER NOT NULL,
  content_type TEXT,
  uploaded_by UUID NOT NULL DEFAULT auth.uid() REFERENCES profiles(id),
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE permit_attachments ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON permit_attachments FROM anon;
GRANT SELECT, INSERT, DELETE ON permit_attachments TO authenticated;
GRANT ALL ON permit_attachments TO service_role;

-- Take the storage folder name (text) so a malformed path is simply "not allowed" instead of a uuid cast error.
CREATE OR REPLACE FUNCTION public.can_view_permit(p_permit_id TEXT) RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM permits p WHERE p.id::text = p_permit_id AND (
      my_role() IN ('safety', 'area_owner', 'manager')
      OR (my_role() = 'contractor' AND p.contractor_id = my_contractor_id())
    )
  )
$$;

CREATE OR REPLACE FUNCTION public.can_attach_to_permit(p_permit_id TEXT) RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM permits p WHERE p.id::text = p_permit_id AND (
      my_role() IN ('safety', 'area_owner')
      OR (my_role() = 'contractor' AND p.contractor_id = my_contractor_id())
    )
  )
$$;

DROP POLICY IF EXISTS permit_attachments_select ON permit_attachments;
DROP POLICY IF EXISTS permit_attachments_insert ON permit_attachments;
DROP POLICY IF EXISTS permit_attachments_delete ON permit_attachments;
CREATE POLICY permit_attachments_select ON permit_attachments FOR SELECT TO authenticated
  USING (can_view_permit(permit_id::text));
CREATE POLICY permit_attachments_insert ON permit_attachments FOR INSERT TO authenticated
  WITH CHECK (uploaded_by = auth.uid() AND can_attach_to_permit(permit_id::text) AND split_part(file_path, '/', 1) = permit_id::text);
CREATE POLICY permit_attachments_delete ON permit_attachments FOR DELETE TO authenticated
  USING (uploaded_by = auth.uid() OR my_role() = 'safety');

-- Files live at permit-files/<permit id>/<random name>. The app removes the file before its row,
-- so the delete rule can look the uploader up in permit_attachments.
DROP POLICY IF EXISTS "permit files read" ON storage.objects;
DROP POLICY IF EXISTS "permit files upload" ON storage.objects;
DROP POLICY IF EXISTS "permit files delete" ON storage.objects;
CREATE POLICY "permit files read" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'permit-files' AND public.can_view_permit((storage.foldername(name))[1]));
CREATE POLICY "permit files upload" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'permit-files' AND public.can_attach_to_permit((storage.foldername(name))[1]));
CREATE POLICY "permit files delete" ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'permit-files' AND (
      public.my_role() = 'safety'
      OR EXISTS (SELECT 1 FROM public.permit_attachments a WHERE a.file_path = storage.objects.name AND a.uploaded_by = auth.uid())
    )
  );
