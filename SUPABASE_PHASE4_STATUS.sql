-- Phase 4: permit status after approval (start / suspend / resume / close) with history. Safe to re-run.

-- Lets the app show who approved (PostgREST can embed profiles through this key).
ALTER TABLE permit_approvals DROP CONSTRAINT IF EXISTS permit_approvals_decided_by_profile_fkey;
ALTER TABLE permit_approvals ADD CONSTRAINT permit_approvals_decided_by_profile_fkey
  FOREIGN KEY (decided_by) REFERENCES profiles(id);

CREATE TABLE IF NOT EXISTS permit_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  permit_id UUID NOT NULL REFERENCES permits(id) ON DELETE CASCADE,
  action TEXT NOT NULL CHECK (action IN ('start', 'suspend', 'resume', 'close')),
  from_status TEXT NOT NULL,
  to_status TEXT NOT NULL,
  note TEXT,
  acted_by UUID NOT NULL REFERENCES profiles(id),
  acted_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE permit_events ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS permit_events_select ON permit_events;
CREATE POLICY permit_events_select ON permit_events FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM permits p WHERE p.id = permit_id));
REVOKE ALL ON permit_events FROM anon;
GRANT SELECT ON permit_events TO authenticated;

-- approved → active (start) → suspended (suspend, reason required) → active (resume); active/suspended → closed (close)
CREATE OR REPLACE FUNCTION public.change_permit_status(p_permit_id UUID, p_action TEXT, p_note TEXT DEFAULT NULL)
RETURNS TEXT
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_from TEXT;
  v_to TEXT;
BEGIN
  IF my_role() IS NULL OR my_role() NOT IN ('safety', 'area_owner') THEN
    RAISE EXCEPTION 'เฉพาะ จป. และเจ้าของพื้นที่เท่านั้นที่เปลี่ยนสถานะงานได้';
  END IF;

  SELECT status INTO v_from FROM permits WHERE id = p_permit_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'ไม่พบ Permit';
  END IF;

  v_to := CASE
    WHEN p_action = 'start' AND v_from = 'approved' THEN 'active'
    WHEN p_action = 'suspend' AND v_from = 'active' THEN 'suspended'
    WHEN p_action = 'resume' AND v_from = 'suspended' THEN 'active'
    WHEN p_action = 'close' AND v_from IN ('active', 'suspended') THEN 'closed'
  END;
  IF v_to IS NULL THEN
    RAISE EXCEPTION 'Permit สถานะ % ใช้คำสั่งนี้ไม่ได้', v_from;
  END IF;
  IF p_action = 'suspend' AND coalesce(trim(p_note), '') = '' THEN
    RAISE EXCEPTION 'กรุณาระบุเหตุผลที่ระงับงาน';
  END IF;

  UPDATE permits SET status = v_to WHERE id = p_permit_id;
  INSERT INTO permit_events (permit_id, action, from_status, to_status, note, acted_by)
  VALUES (p_permit_id, p_action, v_from, v_to, nullif(trim(p_note), ''), auth.uid());

  RETURN v_to;
END
$$;

REVOKE ALL ON FUNCTION public.change_permit_status(UUID, TEXT, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.change_permit_status(UUID, TEXT, TEXT) TO authenticated;
