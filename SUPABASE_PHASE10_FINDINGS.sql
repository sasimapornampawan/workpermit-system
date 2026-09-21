-- Phase 10: record site-inspection findings in the app and close them out. Safe to re-run.

ALTER TABLE findings
  ADD COLUMN IF NOT EXISTS permit_id UUID REFERENCES permits(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS area TEXT,
  ADD COLUMN IF NOT EXISTS detail TEXT,
  ADD COLUMN IF NOT EXISTS severity TEXT NOT NULL DEFAULT 'ปานกลาง' CHECK (severity IN ('สูง', 'ปานกลาง', 'ต่ำ')),
  ADD COLUMN IF NOT EXISTS due_on DATE,
  ADD COLUMN IF NOT EXISTS reported_by UUID DEFAULT auth.uid() REFERENCES profiles(id),
  ADD COLUMN IF NOT EXISTS resolved_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS resolved_by UUID REFERENCES profiles(id),
  ADD COLUMN IF NOT EXISTS resolution_note TEXT,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT now();

GRANT INSERT, DELETE ON findings TO authenticated;

DROP POLICY IF EXISTS findings_insert ON findings;
CREATE POLICY findings_insert ON findings FOR INSERT TO authenticated
  WITH CHECK (my_role() IN ('safety', 'area_owner') AND reported_by = auth.uid() AND NOT resolved);

-- For entries recorded by mistake; closing a real finding goes through resolve_finding instead.
DROP POLICY IF EXISTS findings_delete ON findings;
CREATE POLICY findings_delete ON findings FOR DELETE TO authenticated
  USING (my_role() = 'safety');

CREATE OR REPLACE FUNCTION public.resolve_finding(p_finding_id UUID, p_note TEXT)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF my_role() IS NULL OR my_role() NOT IN ('safety', 'area_owner') THEN
    RAISE EXCEPTION 'เฉพาะ จป. และเจ้าของพื้นที่เท่านั้นที่ปิดข้อบกพร่องได้';
  END IF;
  IF coalesce(trim(p_note), '') = '' THEN
    RAISE EXCEPTION 'กรุณาระบุการแก้ไขที่ทำ';
  END IF;

  UPDATE findings
  SET resolved = true, resolved_at = now(), resolved_by = auth.uid(), resolution_note = trim(p_note)
  WHERE id = p_finding_id AND NOT resolved;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'ไม่พบข้อบกพร่อง หรือปิดไปแล้ว';
  END IF;
END
$$;

REVOKE ALL ON FUNCTION public.resolve_finding(UUID, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.resolve_finding(UUID, TEXT) TO authenticated;
