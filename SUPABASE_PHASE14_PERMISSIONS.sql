-- Phase 14: per-user permissions on top of roles. Safe to re-run.
-- Every write rule now asks can('<permission>') instead of checking the role directly.
-- can() = the user's override if there is one, otherwise the default for their role.

CREATE TABLE IF NOT EXISTS role_permissions (
  role TEXT NOT NULL,
  permission TEXT NOT NULL,
  allowed BOOLEAN NOT NULL,
  PRIMARY KEY (role, permission)
);

CREATE TABLE IF NOT EXISTS user_permissions (
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  permission TEXT NOT NULL,
  allowed BOOLEAN NOT NULL,
  set_by UUID REFERENCES profiles(id) DEFAULT auth.uid(),
  set_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, permission)
);

ALTER TABLE role_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_permissions ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON role_permissions, user_permissions FROM anon, authenticated;

-- Role defaults; ON CONFLICT DO NOTHING so later edits to a default are not overwritten by re-running.
INSERT INTO role_permissions (role, permission, allowed)
SELECT r.role, p.permission,
  CASE r.role
    WHEN 'safety' THEN true
    WHEN 'area_owner' THEN p.permission IN ('approve_permits', 'manage_permit_status', 'manage_findings', 'manage_alerts', 'view_reports')
    WHEN 'manager' THEN p.permission IN ('approve_permits', 'view_reports')
    WHEN 'contractor' THEN p.permission IN ('manage_badges', 'run_exams', 'request_permits')
  END
FROM (VALUES ('safety'), ('area_owner'), ('manager'), ('contractor')) AS r(role)
CROSS JOIN (VALUES
  ('manage_contractors'), ('manage_badges'), ('manage_courses'), ('run_exams'), ('request_permits'), ('approve_permits'),
  ('manage_permit_status'), ('manage_findings'), ('manage_alerts'), ('manage_reports_data'), ('view_reports'), ('manage_users')
) AS p(permission)
ON CONFLICT (role, permission) DO NOTHING;

CREATE OR REPLACE FUNCTION public.can(p_permission TEXT) RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT up.allowed FROM user_permissions up WHERE up.user_id = auth.uid() AND up.permission = p_permission),
    (SELECT rp.allowed FROM role_permissions rp WHERE rp.role = my_role() AND rp.permission = p_permission),
    false
  )
$$;

/** Permissions the signed-in user actually has, for showing or hiding parts of the app. */
CREATE OR REPLACE FUNCTION public.my_permissions() RETURNS TEXT[]
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT COALESCE(array_agg(p.permission ORDER BY p.permission), '{}')
  FROM (SELECT DISTINCT permission FROM role_permissions) p
  WHERE can(p.permission)
$$;

CREATE OR REPLACE FUNCTION public.admin_list_permissions(p_user_id UUID)
RETURNS TABLE (permission TEXT, role_default BOOLEAN, override BOOLEAN)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT p.permission,
    COALESCE((SELECT rp.allowed FROM role_permissions rp JOIN profiles pr ON pr.id = p_user_id AND rp.role = pr.role AND rp.permission = p.permission), false),
    (SELECT up.allowed FROM user_permissions up WHERE up.user_id = p_user_id AND up.permission = p.permission)
  FROM (SELECT DISTINCT permission FROM role_permissions) p
  WHERE can('manage_users')
  ORDER BY p.permission
$$;

/** p_allowed NULL removes the override so the role default applies again. */
CREATE OR REPLACE FUNCTION public.admin_set_permission(p_user_id UUID, p_permission TEXT, p_allowed BOOLEAN)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NOT can('manage_users') THEN
    RAISE EXCEPTION 'ไม่มีสิทธิ์กำหนดสิทธิ์ผู้ใช้';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM role_permissions WHERE permission = p_permission) THEN
    RAISE EXCEPTION 'ไม่รู้จักสิทธิ์นี้';
  END IF;
  IF p_user_id = auth.uid() AND p_permission = 'manage_users' AND p_allowed IS DISTINCT FROM true THEN
    RAISE EXCEPTION 'ปิดสิทธิ์จัดการผู้ใช้ของตัวเองไม่ได้';
  END IF;

  IF p_allowed IS NULL THEN
    DELETE FROM user_permissions WHERE user_id = p_user_id AND permission = p_permission;
  ELSE
    INSERT INTO user_permissions (user_id, permission, allowed, set_by, set_at)
    VALUES (p_user_id, p_permission, p_allowed, auth.uid(), now())
    ON CONFLICT (user_id, permission) DO UPDATE SET allowed = EXCLUDED.allowed, set_by = EXCLUDED.set_by, set_at = EXCLUDED.set_at;
  END IF;
END
$$;

REVOKE ALL ON FUNCTION public.can(TEXT), public.my_permissions(), public.admin_list_permissions(UUID), public.admin_set_permission(UUID, TEXT, BOOLEAN) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.can(TEXT), public.my_permissions(), public.admin_list_permissions(UUID), public.admin_set_permission(UUID, TEXT, BOOLEAN) TO authenticated;

-- ---------- Table rules ----------

DROP POLICY IF EXISTS contractors_insert ON contractors;
DROP POLICY IF EXISTS contractors_update ON contractors;
CREATE POLICY contractors_insert ON contractors FOR INSERT TO authenticated WITH CHECK (can('manage_contractors'));
CREATE POLICY contractors_update ON contractors FOR UPDATE TO authenticated
  USING (can('manage_contractors')) WITH CHECK (can('manage_contractors'));

DROP POLICY IF EXISTS badges_insert ON badges;
DROP POLICY IF EXISTS badges_update ON badges;
CREATE POLICY badges_insert ON badges FOR INSERT TO authenticated
  WITH CHECK (
    can('manage_badges') AND requested_by = auth.uid() AND issued_at IS NULL AND (
      (my_role() = 'contractor' AND company = my_company() AND status = 'pending_docs' AND training_status = 'warn')
      OR (my_role() <> 'contractor' AND status <> 'issued')
    )
  );
CREATE POLICY badges_update ON badges FOR UPDATE TO authenticated
  USING (can('manage_badges') AND my_role() <> 'contractor')
  WITH CHECK (can('manage_badges') AND my_role() <> 'contractor');

DROP POLICY IF EXISTS courses_insert ON courses;
DROP POLICY IF EXISTS courses_update ON courses;
DROP POLICY IF EXISTS courses_delete ON courses;
DROP POLICY IF EXISTS course_questions_safety ON course_questions;
CREATE POLICY courses_insert ON courses FOR INSERT TO authenticated WITH CHECK (can('manage_courses'));
CREATE POLICY courses_update ON courses FOR UPDATE TO authenticated USING (can('manage_courses')) WITH CHECK (can('manage_courses'));
CREATE POLICY courses_delete ON courses FOR DELETE TO authenticated USING (can('manage_courses'));
CREATE POLICY course_questions_manage ON course_questions FOR ALL TO authenticated
  USING (can('manage_courses')) WITH CHECK (can('manage_courses'));

DROP POLICY IF EXISTS permits_insert ON permits;
CREATE POLICY permits_insert ON permits FOR INSERT TO authenticated
  WITH CHECK (
    can('request_permits') AND status = 'pending' AND created_by = auth.uid()
    AND (my_role() <> 'contractor' OR contractor_id = my_contractor_id())
  );

DROP POLICY IF EXISTS findings_insert ON findings;
DROP POLICY IF EXISTS findings_delete ON findings;
CREATE POLICY findings_insert ON findings FOR INSERT TO authenticated
  WITH CHECK (can('manage_findings') AND reported_by = auth.uid() AND NOT resolved);
CREATE POLICY findings_delete ON findings FOR DELETE TO authenticated USING (can('manage_findings'));

DROP POLICY IF EXISTS alerts_insert ON alerts;
DROP POLICY IF EXISTS alerts_update ON alerts;
DROP POLICY IF EXISTS alerts_select ON alerts;
CREATE POLICY alerts_select ON alerts FOR SELECT TO authenticated
  USING (my_role() IN ('safety', 'area_owner', 'manager') OR can('manage_alerts'));
CREATE POLICY alerts_insert ON alerts FOR INSERT TO authenticated
  WITH CHECK (can('manage_alerts') AND created_by = auth.uid() AND closed_at IS NULL AND severity IN ('bad', 'warn', 'info'));
CREATE POLICY alerts_update ON alerts FOR UPDATE TO authenticated
  USING (can('manage_alerts')) WITH CHECK (can('manage_alerts') AND severity IN ('bad', 'warn', 'info'));

DROP POLICY IF EXISTS monthly_reports_select ON monthly_reports;
DROP POLICY IF EXISTS monthly_reports_insert ON monthly_reports;
DROP POLICY IF EXISTS monthly_reports_update ON monthly_reports;
CREATE POLICY monthly_reports_select ON monthly_reports FOR SELECT TO authenticated USING (can('view_reports'));
CREATE POLICY monthly_reports_insert ON monthly_reports FOR INSERT TO authenticated
  WITH CHECK (can('manage_reports_data') AND extract(day FROM month) = 1);
CREATE POLICY monthly_reports_update ON monthly_reports FOR UPDATE TO authenticated
  USING (can('manage_reports_data')) WITH CHECK (can('manage_reports_data') AND extract(day FROM month) = 1);

DROP POLICY IF EXISTS recommendations_select ON recommendations;
DROP POLICY IF EXISTS recommendations_insert ON recommendations;
DROP POLICY IF EXISTS recommendations_update ON recommendations;
DROP POLICY IF EXISTS recommendations_delete ON recommendations;
CREATE POLICY recommendations_select ON recommendations FOR SELECT TO authenticated USING (can('view_reports'));
CREATE POLICY recommendations_insert ON recommendations FOR INSERT TO authenticated
  WITH CHECK (can('manage_reports_data') AND priority IN ('high', 'medium', 'low'));
CREATE POLICY recommendations_update ON recommendations FOR UPDATE TO authenticated
  USING (can('manage_reports_data')) WITH CHECK (can('manage_reports_data') AND priority IN ('high', 'medium', 'low'));
CREATE POLICY recommendations_delete ON recommendations FOR DELETE TO authenticated USING (can('manage_reports_data'));

-- ---------- Functions that enforced roles ----------

CREATE OR REPLACE FUNCTION public.decide_permit(p_permit_id UUID, p_decision TEXT, p_note TEXT DEFAULT NULL)
RETURNS TEXT
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_permit permits;
  v_step TEXT;
BEGIN
  IF p_decision NOT IN ('approved', 'rejected') THEN
    RAISE EXCEPTION 'ผลการพิจารณาไม่ถูกต้อง';
  END IF;
  IF NOT can('approve_permits') THEN
    RAISE EXCEPTION 'ไม่มีสิทธิ์อนุมัติ Permit';
  END IF;

  SELECT * INTO v_permit FROM permits WHERE id = p_permit_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'ไม่พบ Permit';
  END IF;

  v_step := permit_next_step(v_permit);
  IF v_step IS NULL THEN
    RAISE EXCEPTION 'Permit นี้ไม่ได้อยู่ในขั้นตอนรออนุมัติ';
  END IF;
  IF my_role() IS DISTINCT FROM v_step THEN
    RAISE EXCEPTION 'บทบาทของคุณไม่มีสิทธิ์อนุมัติขั้นตอนนี้';
  END IF;

  INSERT INTO permit_approvals (permit_id, step, decision, decided_by, note)
  VALUES (p_permit_id, v_step, p_decision, auth.uid(), p_note);

  IF p_decision = 'rejected' THEN
    UPDATE permits SET status = 'rejected' WHERE id = p_permit_id;
  ELSE
    SELECT * INTO v_permit FROM permits WHERE id = p_permit_id;
    IF permit_next_step(v_permit) IS NULL THEN
      UPDATE permits SET status = 'approved' WHERE id = p_permit_id;
    END IF;
  END IF;

  RETURN (SELECT status FROM permits WHERE id = p_permit_id);
END
$$;

CREATE OR REPLACE FUNCTION public.change_permit_status(p_permit_id UUID, p_action TEXT, p_note TEXT DEFAULT NULL)
RETURNS TEXT
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_from TEXT;
  v_to TEXT;
BEGIN
  IF NOT can('manage_permit_status') THEN
    RAISE EXCEPTION 'ไม่มีสิทธิ์เปลี่ยนสถานะงาน';
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

CREATE OR REPLACE FUNCTION public.resolve_finding(p_finding_id UUID, p_note TEXT)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NOT can('manage_findings') THEN
    RAISE EXCEPTION 'ไม่มีสิทธิ์ปิดข้อบกพร่อง';
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

CREATE OR REPLACE FUNCTION public.start_exam(p_course_code TEXT, p_badge_id UUID)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_course courses;
  v_badge badges;
  v_ids UUID[];
  v_attempt UUID;
BEGIN
  IF NOT can('run_exams') THEN
    RAISE EXCEPTION 'ไม่มีสิทธิ์จัดสอบ';
  END IF;

  SELECT * INTO v_course FROM courses WHERE code = p_course_code AND active;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'ไม่พบหลักสูตร หรือหลักสูตรนี้ปิดใช้งาน';
  END IF;

  SELECT * INTO v_badge FROM badges WHERE id = p_badge_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'ไม่พบผู้เข้าอบรม';
  END IF;
  IF my_role() = 'contractor' AND v_badge.company IS DISTINCT FROM my_company() THEN
    RAISE EXCEPTION 'ไม่มีสิทธิ์จัดสอบให้ผู้เข้าอบรมคนนี้';
  END IF;

  SELECT array_agg(id) INTO v_ids FROM (
    SELECT id FROM course_questions WHERE course_code = p_course_code ORDER BY random() LIMIT v_course.question_count
  ) q;
  IF v_ids IS NULL THEN
    RAISE EXCEPTION 'หลักสูตรนี้ยังไม่มีข้อสอบ';
  END IF;

  INSERT INTO exam_attempts (course_code, badge_id, question_ids, started_by)
  VALUES (p_course_code, p_badge_id, v_ids, auth.uid())
  RETURNING id INTO v_attempt;

  RETURN jsonb_build_object(
    'attempt_id', v_attempt,
    'questions', (
      SELECT jsonb_agg(jsonb_build_object('id', q.id, 'question', q.question, 'options', q.options) ORDER BY array_position(v_ids, q.id))
      FROM course_questions q WHERE q.id = ANY (v_ids)
    )
  );
END
$$;

CREATE OR REPLACE FUNCTION public.can_edit_badge_photo(p_badge_id TEXT) RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT can('manage_badges') AND EXISTS (
    SELECT 1 FROM badges b WHERE b.id::text = p_badge_id AND (my_role() <> 'contractor' OR b.company = my_company())
  )
$$;

CREATE OR REPLACE FUNCTION public.can_attach_to_permit(p_permit_id TEXT) RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM permits p WHERE p.id::text = p_permit_id AND (
      (my_role() IN ('safety', 'area_owner') AND (can('request_permits') OR can('manage_permit_status')))
      OR (my_role() = 'contractor' AND p.contractor_id = my_contractor_id() AND can('request_permits'))
    )
  )
$$;

CREATE OR REPLACE FUNCTION public.admin_set_profile(p_user_id UUID, p_full_name TEXT, p_role TEXT, p_contractor_id UUID DEFAULT NULL)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NOT can('manage_users') THEN
    RAISE EXCEPTION 'ไม่มีสิทธิ์กำหนดบทบาทผู้ใช้';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = p_user_id) THEN
    RAISE EXCEPTION 'ไม่พบบัญชีผู้ใช้';
  END IF;
  IF p_user_id = auth.uid() AND p_role IS DISTINCT FROM 'safety' THEN
    RAISE EXCEPTION 'เปลี่ยนหรือยกเลิกสิทธิ์ของตัวเองไม่ได้';
  END IF;

  IF p_role IS NULL THEN
    UPDATE profiles SET active = false WHERE id = p_user_id;
    RETURN;
  END IF;

  IF p_role NOT IN ('safety', 'contractor', 'area_owner', 'manager') THEN
    RAISE EXCEPTION 'บทบาทไม่ถูกต้อง';
  END IF;
  IF p_role = 'contractor' AND p_contractor_id IS NULL THEN
    RAISE EXCEPTION 'บัญชีผู้รับเหมาต้องเลือกบริษัท';
  END IF;
  IF coalesce(trim(p_full_name), '') = '' THEN
    RAISE EXCEPTION 'กรุณาใส่ชื่อที่แสดง';
  END IF;

  INSERT INTO profiles (id, full_name, role, contractor_id, active)
  VALUES (p_user_id, trim(p_full_name), p_role, CASE WHEN p_role = 'contractor' THEN p_contractor_id END, true)
  ON CONFLICT (id) DO UPDATE
    SET full_name = EXCLUDED.full_name, role = EXCLUDED.role, contractor_id = EXCLUDED.contractor_id, active = true;
END
$$;

CREATE OR REPLACE FUNCTION public.admin_require_password_change(p_user_id UUID) RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NOT can('manage_users') THEN
    RAISE EXCEPTION 'ไม่มีสิทธิ์จัดการผู้ใช้';
  END IF;
  UPDATE profiles SET must_change_password = true WHERE id = p_user_id;
END
$$;

CREATE OR REPLACE FUNCTION public.admin_list_users()
RETURNS TABLE (
  id UUID, email TEXT, full_name TEXT, role TEXT, active BOOLEAN,
  contractor_id UUID, contractor_name TEXT, created_at TIMESTAMPTZ, last_sign_in_at TIMESTAMPTZ
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT u.id, u.email::text, p.full_name, p.role, p.active, p.contractor_id, c.name, u.created_at, u.last_sign_in_at
  FROM auth.users u
  LEFT JOIN profiles p ON p.id = u.id
  LEFT JOIN contractors c ON c.id = p.contractor_id
  WHERE can('manage_users')
  ORDER BY u.created_at
$$;
