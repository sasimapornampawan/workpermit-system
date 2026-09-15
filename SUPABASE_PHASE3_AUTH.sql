-- Phase 3: login, roles and permissions. Safe to re-run.
-- Roles: safety = จป., contractor = ผู้รับเหมา, area_owner = เจ้าของพื้นที่, manager = ผู้จัดการโรงงาน

CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('safety', 'contractor', 'area_owner', 'manager')),
  contractor_id UUID REFERENCES contractors(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT contractor_needs_company CHECK (role <> 'contractor' OR contractor_id IS NOT NULL)
);

-- SECURITY DEFINER so policies can look up the caller's profile without recursing through RLS.
CREATE OR REPLACE FUNCTION public.my_role() RETURNS TEXT
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT role FROM profiles WHERE id = auth.uid() $$;

CREATE OR REPLACE FUNCTION public.my_contractor_id() RETURNS UUID
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT contractor_id FROM profiles WHERE id = auth.uid() $$;

CREATE OR REPLACE FUNCTION public.my_company() RETURNS TEXT
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT c.name FROM profiles p JOIN contractors c ON c.id = p.contractor_id WHERE p.id = auth.uid() $$;

-- ---------- Permits ----------

CREATE SEQUENCE IF NOT EXISTS permit_no_seq;

ALTER TABLE permits
  ADD COLUMN IF NOT EXISTS detail TEXT,
  ADD COLUMN IF NOT EXISTS start_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS end_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS workers INTEGER,
  ADD COLUMN IF NOT EXISTS created_by UUID DEFAULT auth.uid() REFERENCES auth.users(id);

ALTER TABLE permits ALTER COLUMN permit_no SET DEFAULT
  'WP-' || (EXTRACT(YEAR FROM now() AT TIME ZONE 'Asia/Bangkok')::int + 543)
  || '-' || to_char(now() AT TIME ZONE 'Asia/Bangkok', 'MMDD')
  || '-' || lpad(nextval('permit_no_seq')::text, 3, '0');

CREATE TABLE IF NOT EXISTS permit_approvals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  permit_id UUID NOT NULL REFERENCES permits(id) ON DELETE CASCADE,
  step TEXT NOT NULL CHECK (step IN ('safety', 'area_owner', 'manager')),
  decision TEXT NOT NULL CHECK (decision IN ('approved', 'rejected')),
  decided_by UUID NOT NULL REFERENCES auth.users(id),
  note TEXT,
  decided_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (permit_id, step)
);

-- Approval order: จป. → เจ้าของพื้นที่ → ผู้จัดการ (high-risk only). NULL when nothing is waiting.
CREATE OR REPLACE FUNCTION public.permit_next_step(p permits) RETURNS TEXT
LANGUAGE sql STABLE SET search_path = public
AS $$
  SELECT CASE
    WHEN p.status <> 'pending' THEN NULL
    WHEN NOT EXISTS (SELECT 1 FROM permit_approvals a WHERE a.permit_id = p.id AND a.step = 'safety') THEN 'safety'
    WHEN NOT EXISTS (SELECT 1 FROM permit_approvals a WHERE a.permit_id = p.id AND a.step = 'area_owner') THEN 'area_owner'
    WHEN p.risk = 'สูง' AND NOT EXISTS (SELECT 1 FROM permit_approvals a WHERE a.permit_id = p.id AND a.step = 'manager') THEN 'manager'
  END
$$;

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

REVOKE ALL ON FUNCTION public.decide_permit(UUID, TEXT, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.decide_permit(UUID, TEXT, TEXT) TO authenticated;

-- ---------- Badges ----------

ALTER TABLE badges
  ADD COLUMN IF NOT EXISTS issued_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS issued_by UUID REFERENCES auth.users(id);

-- ---------- Access rules: login required, contractors see only their own company ----------

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE permit_approvals ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN
    SELECT policyname, tablename FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename IN ('profiles', 'contractors', 'permits', 'permit_approvals', 'badges', 'courses',
                        'exam_results', 'alerts', 'findings', 'monthly_reports', 'recommendations')
  LOOP
    EXECUTE format('DROP POLICY %I ON public.%I', r.policyname, r.tablename);
  END LOOP;
END $$;

REVOKE ALL ON profiles, contractors, permits, permit_approvals, badges, courses, exam_results, alerts, findings, monthly_reports, recommendations FROM anon;
GRANT SELECT ON profiles, contractors, permits, permit_approvals, badges, courses, exam_results, alerts, findings, monthly_reports, recommendations TO authenticated;
GRANT INSERT, UPDATE ON contractors TO authenticated;
GRANT INSERT ON permits TO authenticated;
GRANT UPDATE ON badges TO authenticated;
GRANT USAGE ON SEQUENCE permit_no_seq TO authenticated;

CREATE POLICY profiles_select ON profiles FOR SELECT TO authenticated
  USING (id = auth.uid() OR my_role() IN ('safety', 'area_owner', 'manager'));

CREATE POLICY contractors_select ON contractors FOR SELECT TO authenticated
  USING (my_role() IN ('safety', 'area_owner', 'manager') OR id = my_contractor_id());
CREATE POLICY contractors_insert ON contractors FOR INSERT TO authenticated
  WITH CHECK (my_role() = 'safety');
CREATE POLICY contractors_update ON contractors FOR UPDATE TO authenticated
  USING (my_role() = 'safety') WITH CHECK (my_role() = 'safety');

CREATE POLICY permits_select ON permits FOR SELECT TO authenticated
  USING (my_role() IN ('safety', 'area_owner', 'manager') OR contractor_id = my_contractor_id());
CREATE POLICY permits_insert ON permits FOR INSERT TO authenticated
  WITH CHECK (
    status = 'pending' AND created_by = auth.uid()
    AND (my_role() = 'safety' OR (my_role() = 'contractor' AND contractor_id = my_contractor_id()))
  );

CREATE POLICY permit_approvals_select ON permit_approvals FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM permits p WHERE p.id = permit_id));

CREATE POLICY badges_select ON badges FOR SELECT TO authenticated
  USING (my_role() IN ('safety', 'area_owner', 'manager') OR company = my_company());
CREATE POLICY badges_update ON badges FOR UPDATE TO authenticated
  USING (my_role() = 'safety') WITH CHECK (my_role() = 'safety');

CREATE POLICY courses_select ON courses FOR SELECT TO authenticated
  USING (my_role() IS NOT NULL);

CREATE POLICY exam_results_select ON exam_results FOR SELECT TO authenticated
  USING (my_role() IN ('safety', 'area_owner', 'manager') OR company = my_company());

CREATE POLICY findings_select ON findings FOR SELECT TO authenticated
  USING (my_role() IN ('safety', 'area_owner', 'manager') OR contractor_id = my_contractor_id());

CREATE POLICY alerts_select ON alerts FOR SELECT TO authenticated
  USING (my_role() IN ('safety', 'area_owner', 'manager'));

CREATE POLICY monthly_reports_select ON monthly_reports FOR SELECT TO authenticated
  USING (my_role() IN ('safety', 'area_owner', 'manager'));

CREATE POLICY recommendations_select ON recommendations FOR SELECT TO authenticated
  USING (my_role() IN ('safety', 'area_owner', 'manager'));

-- ---------- Adding users ----------
-- 1) Supabase → Authentication → Users → Add user → Create new user (tick "Auto Confirm User")
-- 2) Give that login a role by running one of these, with the real email and name:
--
-- INSERT INTO profiles (id, full_name, role) SELECT id, 'สมชาย อารักษ์', 'safety' FROM auth.users WHERE email = 'safety@example.com';
-- INSERT INTO profiles (id, full_name, role) SELECT id, 'นายประสิทธิ์ มั่นคง', 'area_owner' FROM auth.users WHERE email = 'area@example.com';
-- INSERT INTO profiles (id, full_name, role) SELECT id, 'นายวีระพงษ์ เจริญสุข', 'manager' FROM auth.users WHERE email = 'manager@example.com';
-- INSERT INTO profiles (id, full_name, role, contractor_id)
--   SELECT u.id, 'นายอนุชา ศรีสมบัติ', 'contractor', c.id FROM auth.users u, contractors c
--   WHERE u.email = 'contractor@example.com' AND c.code = 'CTR-0203';
