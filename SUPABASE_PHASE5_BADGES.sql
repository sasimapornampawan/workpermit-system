-- Phase 5: badge requests from the app and contractor editing. Safe to re-run.

-- ---------- Badge requests ----------

CREATE SEQUENCE IF NOT EXISTS badge_card_seq;

ALTER TABLE badges ADD COLUMN IF NOT EXISTS requested_by UUID DEFAULT auth.uid() REFERENCES auth.users(id);

ALTER TABLE badges ALTER COLUMN card_no SET DEFAULT
  'CT-' || (EXTRACT(YEAR FROM now() AT TIME ZONE 'Asia/Bangkok')::int + 543)
  || '-' || lpad(nextval('badge_card_seq')::text, 4, '0');
ALTER TABLE badges ALTER COLUMN training SET DEFAULT 'รอตรวจสอบ';
ALTER TABLE badges ALTER COLUMN training_status SET DEFAULT 'warn';
ALTER TABLE badges ALTER COLUMN status SET DEFAULT 'pending_docs';

GRANT INSERT ON badges TO authenticated;
GRANT USAGE ON SEQUENCE badge_card_seq TO authenticated;

-- Contractors may only request badges for their own company, starting at "รอเอกสาร" with training unverified.
DROP POLICY IF EXISTS badges_insert ON badges;
CREATE POLICY badges_insert ON badges FOR INSERT TO authenticated
  WITH CHECK (
    requested_by = auth.uid() AND issued_at IS NULL AND (
      (my_role() = 'safety' AND status <> 'issued')
      OR (my_role() = 'contractor' AND company = my_company() AND status = 'pending_docs' AND training_status = 'warn')
    )
  );

-- ---------- Contractors ----------

-- Badges and exam results refer to the company by name, so names must be unique and renames must follow through.
CREATE UNIQUE INDEX IF NOT EXISTS contractors_name_key ON contractors (name);

CREATE OR REPLACE FUNCTION public.sync_contractor_name() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NEW.name IS DISTINCT FROM OLD.name THEN
    UPDATE badges SET company = NEW.name WHERE company = OLD.name;
    UPDATE exam_results SET company = NEW.name WHERE company = OLD.name;
  END IF;
  RETURN NEW;
END
$$;

DROP TRIGGER IF EXISTS contractors_sync_name ON contractors;
CREATE TRIGGER contractors_sync_name AFTER UPDATE OF name ON contractors
  FOR EACH ROW EXECUTE FUNCTION public.sync_contractor_name();
