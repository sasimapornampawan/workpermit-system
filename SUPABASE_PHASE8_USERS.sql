-- Phase 8: user and role management for safety officers. Safe to re-run.

-- Revoking access deactivates the profile instead of deleting it, so approval and status history keep their author.
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS active BOOLEAN NOT NULL DEFAULT true;

CREATE OR REPLACE FUNCTION public.my_role() RETURNS TEXT
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT role FROM profiles WHERE id = auth.uid() AND active $$;

CREATE OR REPLACE FUNCTION public.my_contractor_id() RETURNS UUID
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT contractor_id FROM profiles WHERE id = auth.uid() AND active $$;

CREATE OR REPLACE FUNCTION public.my_company() RETURNS TEXT
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT c.name FROM profiles p JOIN contractors c ON c.id = p.contractor_id WHERE p.id = auth.uid() AND p.active $$;

-- Every login with its role; returns nothing unless the caller is a safety officer.
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
  WHERE my_role() = 'safety'
  ORDER BY u.created_at
$$;

-- p_role NULL revokes access. A safety officer cannot change their own role, so the system always keeps an admin.
CREATE OR REPLACE FUNCTION public.admin_set_profile(p_user_id UUID, p_full_name TEXT, p_role TEXT, p_contractor_id UUID DEFAULT NULL)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF my_role() IS DISTINCT FROM 'safety' THEN
    RAISE EXCEPTION 'เฉพาะ จป. เท่านั้นที่กำหนดสิทธิ์ผู้ใช้ได้';
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

REVOKE ALL ON FUNCTION public.admin_list_users() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_set_profile(UUID, TEXT, TEXT, UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_list_users() TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_set_profile(UUID, TEXT, TEXT, UUID) TO authenticated;
