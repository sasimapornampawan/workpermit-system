-- Phase 9: force a password change after a safety officer creates an account or resets its password. Safe to re-run.

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS must_change_password BOOLEAN NOT NULL DEFAULT false;

CREATE OR REPLACE FUNCTION public.admin_require_password_change(p_user_id UUID) RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF my_role() IS DISTINCT FROM 'safety' THEN
    RAISE EXCEPTION 'เฉพาะ จป. เท่านั้น';
  END IF;
  UPDATE profiles SET must_change_password = true WHERE id = p_user_id;
END
$$;

-- Called by the user after setting their own password.
CREATE OR REPLACE FUNCTION public.password_changed() RETURNS VOID
LANGUAGE sql SECURITY DEFINER SET search_path = public
AS $$ UPDATE profiles SET must_change_password = false WHERE id = auth.uid() $$;

REVOKE ALL ON FUNCTION public.admin_require_password_change(UUID) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.password_changed() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_require_password_change(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.password_changed() TO authenticated;
