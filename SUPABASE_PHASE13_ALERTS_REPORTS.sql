-- Phase 13: manage dashboard alerts, monthly report figures and management recommendations in the app. Safe to re-run.

-- ---------- Alerts (safety officers and area owners) ----------

ALTER TABLE alerts
  ADD COLUMN IF NOT EXISTS created_by UUID DEFAULT auth.uid() REFERENCES profiles(id),
  ADD COLUMN IF NOT EXISTS closed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS closed_by UUID REFERENCES profiles(id);

GRANT INSERT, UPDATE ON alerts TO authenticated;

DROP POLICY IF EXISTS alerts_insert ON alerts;
DROP POLICY IF EXISTS alerts_update ON alerts;
CREATE POLICY alerts_insert ON alerts FOR INSERT TO authenticated
  WITH CHECK (my_role() IN ('safety', 'area_owner') AND created_by = auth.uid() AND closed_at IS NULL AND severity IN ('bad', 'warn', 'info'));
CREATE POLICY alerts_update ON alerts FOR UPDATE TO authenticated
  USING (my_role() IN ('safety', 'area_owner'))
  WITH CHECK (my_role() IN ('safety', 'area_owner') AND severity IN ('bad', 'warn', 'info'));

-- ---------- Monthly report figures (safety officers) ----------

GRANT INSERT, UPDATE ON monthly_reports TO authenticated;

DROP POLICY IF EXISTS monthly_reports_insert ON monthly_reports;
DROP POLICY IF EXISTS monthly_reports_update ON monthly_reports;
CREATE POLICY monthly_reports_insert ON monthly_reports FOR INSERT TO authenticated
  WITH CHECK (my_role() = 'safety' AND extract(day FROM month) = 1);
CREATE POLICY monthly_reports_update ON monthly_reports FOR UPDATE TO authenticated
  USING (my_role() = 'safety') WITH CHECK (my_role() = 'safety' AND extract(day FROM month) = 1);

-- ---------- Management recommendations (safety officers) ----------

GRANT INSERT, UPDATE, DELETE ON recommendations TO authenticated;

DROP POLICY IF EXISTS recommendations_insert ON recommendations;
DROP POLICY IF EXISTS recommendations_update ON recommendations;
DROP POLICY IF EXISTS recommendations_delete ON recommendations;
CREATE POLICY recommendations_insert ON recommendations FOR INSERT TO authenticated
  WITH CHECK (my_role() = 'safety' AND priority IN ('high', 'medium', 'low'));
CREATE POLICY recommendations_update ON recommendations FOR UPDATE TO authenticated
  USING (my_role() = 'safety') WITH CHECK (my_role() = 'safety' AND priority IN ('high', 'medium', 'low'));
CREATE POLICY recommendations_delete ON recommendations FOR DELETE TO authenticated
  USING (my_role() = 'safety');
