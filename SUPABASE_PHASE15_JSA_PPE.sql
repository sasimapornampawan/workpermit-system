-- Phase 15: JSA hazards and PPE lists kept in the database and edited by safety officers. Safe to re-run.
-- permit_type_code NULL means the row applies to every permit type; otherwise it matches PERMIT_TYPES codes (HW-01, CS-02, ...).

CREATE TABLE IF NOT EXISTS jsa_hazards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  permit_type_code TEXT,
  hazard TEXT NOT NULL,
  control TEXT NOT NULL,
  level TEXT NOT NULL DEFAULT 'ปานกลาง' CHECK (level IN ('สูง', 'ปานกลาง', 'ต่ำ')),
  sort INTEGER NOT NULL DEFAULT 0,
  active BOOLEAN NOT NULL DEFAULT true
);

CREATE TABLE IF NOT EXISTS ppe_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  permit_type_code TEXT,
  label TEXT NOT NULL,
  required BOOLEAN NOT NULL DEFAULT true,
  sort INTEGER NOT NULL DEFAULT 0,
  active BOOLEAN NOT NULL DEFAULT true
);

ALTER TABLE jsa_hazards ENABLE ROW LEVEL SECURITY;
ALTER TABLE ppe_items ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON jsa_hazards, ppe_items FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON jsa_hazards, ppe_items TO authenticated;

INSERT INTO role_permissions (role, permission, allowed)
SELECT r.role, 'manage_jsa_ppe', r.role = 'safety'
FROM (VALUES ('safety'), ('area_owner'), ('manager'), ('contractor')) AS r(role)
ON CONFLICT (role, permission) DO NOTHING;

DROP POLICY IF EXISTS jsa_hazards_select ON jsa_hazards;
DROP POLICY IF EXISTS jsa_hazards_manage ON jsa_hazards;
CREATE POLICY jsa_hazards_select ON jsa_hazards FOR SELECT TO authenticated USING (my_role() IS NOT NULL);
CREATE POLICY jsa_hazards_manage ON jsa_hazards FOR ALL TO authenticated
  USING (can('manage_jsa_ppe')) WITH CHECK (can('manage_jsa_ppe'));

DROP POLICY IF EXISTS ppe_items_select ON ppe_items;
DROP POLICY IF EXISTS ppe_items_manage ON ppe_items;
CREATE POLICY ppe_items_select ON ppe_items FOR SELECT TO authenticated USING (my_role() IS NOT NULL);
CREATE POLICY ppe_items_manage ON ppe_items FOR ALL TO authenticated
  USING (can('manage_jsa_ppe')) WITH CHECK (can('manage_jsa_ppe'));

-- Starting lists, matching what the app used to show. Only inserted while the tables are empty.
INSERT INTO jsa_hazards (permit_type_code, hazard, control, level, sort)
SELECT * FROM (VALUES
  ('HW-01', 'ประกายไฟติดวัสดุไวไฟ', 'เคลื่อนย้ายวัสดุไวไฟออกรัศมี 11 เมตร คลุมผ้ากันไฟ จัดผู้เฝ้าระวังไฟ', 'สูง', 1),
  ('HW-01', 'ไอระเหยสารไวไฟในพื้นที่', 'ตรวจวัดก๊าซก่อนเริ่มงานและทุก 2 ชั่วโมง ต้องต่ำกว่า 10% LEL', 'สูง', 2),
  ('HW-01', 'ควันเชื่อมและฟูมโลหะ', 'ติดตั้งพัดลมดูดอากาศเฉพาะจุด สวมหน้ากากกรองฟูม', 'ปานกลาง', 3),
  ('HW-01', 'พลังงานความร้อนและไอน้ำค้างในระบบ', 'ตัดแยกพลังงาน ระบายแรงดัน ล็อกและแขวนป้าย (LOTO)', 'สูง', 4),
  (NULL, 'ตกจากบันไดและนั่งร้าน', 'ใช้นั่งร้านที่ผ่านการตรวจ ติดป้ายสีเขียว และสวมเข็มขัดนิรภัยแบบเต็มตัว', 'ปานกลาง', 5),
  ('CS-02', 'ออกซิเจนไม่เพียงพอหรือก๊าซพิษสะสม', 'ตรวจวัดบรรยากาศก่อนเข้าและต่อเนื่อง ระบายอากาศ และมีผู้เฝ้าระวังที่ปากทางเข้า', 'สูง', 1),
  ('WH-03', 'ตกจากที่สูง', 'ใช้จุดยึดที่รับน้ำหนักได้ สวมเข็มขัดนิรภัยเต็มตัวตลอดเวลา และกั้นเขตด้านล่าง', 'สูง', 1),
  ('EL-04', 'ไฟฟ้าดูดจากวงจรที่ยังมีไฟ', 'ตัดแยกพลังงาน ล็อกและแขวนป้าย ทดสอบว่าไม่มีแรงดันก่อนเริ่มงาน', 'สูง', 1),
  ('CH-07', 'สารเคมีกระเด็นหรือรั่วไหล', 'สวม PPE ตาม SDS เตรียมชุดซับสารเคมี และมีจุดล้างตาใกล้พื้นที่', 'สูง', 1)
) AS seed(permit_type_code, hazard, control, level, sort)
WHERE NOT EXISTS (SELECT 1 FROM jsa_hazards);

INSERT INTO ppe_items (permit_type_code, label, required, sort)
SELECT * FROM (VALUES
  (NULL, 'หมวกนิรภัย', true, 1),
  (NULL, 'แว่นตานิรภัย', true, 2),
  (NULL, 'รองเท้านิรภัย', true, 3),
  (NULL, 'ถุงมือหนัง', true, 4),
  (NULL, 'ที่อุดหูลดเสียง', false, 5),
  ('HW-01', 'หน้ากากเชื่อม', true, 1),
  ('HW-01', 'ชุดกันประกายไฟ', true, 2),
  ('HW-01', 'หน้ากากกรองฟูม', true, 3),
  ('WH-03', 'เข็มขัดนิรภัยแบบเต็มตัว', true, 1),
  ('CS-02', 'เครื่องตรวจวัดก๊าซติดตัว', true, 1),
  ('CH-07', 'ชุดป้องกันสารเคมี', true, 1)
) AS seed(permit_type_code, label, required, sort)
WHERE NOT EXISTS (SELECT 1 FROM ppe_items);
