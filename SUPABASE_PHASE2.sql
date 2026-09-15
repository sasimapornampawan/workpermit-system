-- Phase 2: data for dashboard, badges, training and reports. Safe to re-run.

ALTER TABLE contractors ADD COLUMN IF NOT EXISTS safety_score INTEGER;

ALTER TABLE badges
  ADD COLUMN IF NOT EXISTS id_no TEXT,
  ADD COLUMN IF NOT EXISTS kind TEXT,
  ADD COLUMN IF NOT EXISTS tier TEXT,
  ADD COLUMN IF NOT EXISTS card_no TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS expiry TEXT,
  ADD COLUMN IF NOT EXISTS role TEXT,
  ADD COLUMN IF NOT EXISTS perms TEXT[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS training_status TEXT NOT NULL DEFAULT 'ok';

CREATE TABLE IF NOT EXISTS courses (
  code TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  detail TEXT NOT NULL,
  pass_rate INTEGER NOT NULL,
  taken INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS exam_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  company TEXT NOT NULL,
  course_code TEXT NOT NULL REFERENCES courses(code),
  taken_on DATE NOT NULL,
  score INTEGER NOT NULL,
  result TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  detail TEXT NOT NULL,
  severity TEXT NOT NULL DEFAULT 'info',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS findings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category TEXT NOT NULL,
  contractor_id UUID NOT NULL REFERENCES contractors(id),
  found_on DATE NOT NULL DEFAULT CURRENT_DATE,
  resolved BOOLEAN NOT NULL DEFAULT false
);

CREATE TABLE IF NOT EXISTS monthly_reports (
  month DATE PRIMARY KEY,
  safe_hours INTEGER NOT NULL,
  near_misses INTEGER NOT NULL,
  on_time_close_pct INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS recommendations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  detail TEXT NOT NULL,
  priority TEXT NOT NULL DEFAULT 'medium',
  sort INTEGER NOT NULL DEFAULT 0
);

DO $$
DECLARE t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY['courses', 'exam_results', 'alerts', 'findings', 'monthly_reports', 'recommendations'] LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('DROP POLICY IF EXISTS "Enable read access for all users" ON public.%I', t);
    EXECUTE format('CREATE POLICY "Enable read access for all users" ON public.%I FOR SELECT USING (true)', t);
    EXECUTE format('GRANT SELECT ON public.%I TO anon', t);
  END LOOP;
END $$;

-- ---------- Sample data ----------

INSERT INTO contractors (name, initials, code, scope, workers, insurance, cards, status) VALUES
  ('บจก. อีเล็คโทร พลัส', 'EP', 'CTR-0147', 'งานไฟฟ้า', 44, '30 มิ.ย. 2570', '44 / 44', 'ok'),
  ('บจก. คลีนโปร แมเนจเมนท์', 'CP', 'CTR-0231', 'งานสนับสนุน', 88, '31 ม.ค. 2570', '80 / 88', 'ok'),
  ('บจก. เคมแคร์', 'CC', 'CTR-0175', 'งานสารเคมี', 36, '15 ต.ค. 2569', '30 / 36', 'warn'),
  ('บจก. ไฮไรส์ เวิร์ค', 'HR', 'CTR-0260', 'งานบนที่สูง', 27, '20 ส.ค. 2569', '0 / 27', 'bad')
ON CONFLICT (code) DO NOTHING;

UPDATE contractors c SET safety_score = v.score
FROM (VALUES ('CTR-0147', 98), ('CTR-0118', 92), ('CTR-0231', 89), ('CTR-0203', 85), ('CTR-0175', 83), ('CTR-0092', 78), ('CTR-0260', 61)) AS v(code, score)
WHERE c.code = v.code AND c.safety_score IS NULL;

INSERT INTO permits (permit_no, type, contractor_id, area, risk, status) VALUES
  ('WP-2569-0914-003', 'งานบนที่สูง — เปลี่ยนหลังคา', (SELECT id FROM contractors WHERE code = 'CTR-0092'), 'อาคารคลังสินค้า 3', 'สูง', 'active'),
  ('WP-2569-0914-004', 'งานระบบไฟฟ้า — เปลี่ยนเบรกเกอร์', (SELECT id FROM contractors WHERE code = 'CTR-0147'), 'ห้องไฟฟ้า MDB-2', 'ปานกลาง', 'pending'),
  ('WP-2569-0914-005', 'งานยกของหนัก — ติดตั้งปั๊ม', (SELECT id FROM contractors WHERE code = 'CTR-0118'), 'ลานเครื่องจักร', 'ปานกลาง', 'approved'),
  ('WP-2569-0914-006', 'งานทั่วไป — ทำความสะอาดท่อระบาย', (SELECT id FROM contractors WHERE code = 'CTR-0231'), 'รอบอาคารผลิต', 'ต่ำ', 'active'),
  ('WP-2569-0913-018', 'งานสารเคมี — ถ่ายเทกรด', (SELECT id FROM contractors WHERE code = 'CTR-0175'), 'คลังสารเคมี', 'ปานกลาง', 'closed')
ON CONFLICT (permit_no) DO NOTHING;

INSERT INTO badges (name, company, training, status, id_no, kind, tier, card_no, expiry, role, perms, training_status) VALUES
  ('นายวิชัย ทองสุข', 'บจก. เอส.พี. เอ็นจิเนียริ่ง', 'ผ่าน 3/3', 'ready', '1-3299-xxxxx-42', 'ผู้ปฏิบัติงานประจำ', 'ระดับ 2', 'CT-2569-0418', '31 ส.ค. 2570', 'ช่างเชื่อม', ARRAY['งานความร้อน', 'งานที่สูง', 'งานไฟฟ้าแรงต่ำ', 'พื้นที่ผลิต A-C'], 'ok'),
  ('นายสมพงษ์ แก้วมณี', 'บจก. ไทยคอนสตรัคชั่น', 'ผ่าน 2/3', 'pending_training', '1-1015-xxxxx-08', 'ผู้ปฏิบัติงานชั่วคราว', 'ระดับ 1', 'CT-2569-0455', '30 ก.ย. 2569', 'ช่างทั่วไป', ARRAY['งานทั่วไป', 'พื้นที่ผลิต A'], 'warn'),
  ('นายอนุชา ศรีสมบัติ', 'บจก. พี.เค. เซอร์วิส', 'ผ่าน 3/3', 'ready', '3-7701-xxxxx-15', 'ผู้ควบคุมงาน', 'ผู้ควบคุมงาน', 'CT-2569-0460', '31 ส.ค. 2570', 'หัวหน้าชุดงาน', ARRAY['ที่อับอากาศ', 'งานความร้อน', 'ผู้ควบคุมงาน', 'ทุกพื้นที่ผลิต'], 'ok'),
  ('นายเอกชัย พูลผล', 'บจก. เอส.พี. เอ็นจิเนียริ่ง', 'หมดอายุ', 'rejected', '1-4402-xxxxx-77', 'ผู้ปฏิบัติงานประจำ', 'ระดับ 2', 'CT-2568-0902', '12 ก.ย. 2569', 'ช่างไฟฟ้า', ARRAY['งานไฟฟ้า', 'พื้นที่ผลิต B'], 'bad'),
  ('นางสาวปิยะดา นิลกุล', 'บจก. คลีนโปร แมเนจเมนท์', 'ผ่าน 2/2', 'ready', '1-2204-xxxxx-30', 'ผู้ปฏิบัติงานประจำ', 'ระดับ 1', 'CT-2569-0471', '31 ส.ค. 2570', 'พนักงานทำความสะอาด', ARRAY['งานทั่วไป', 'พื้นที่สำนักงาน', 'พื้นที่ผลิต A'], 'ok'),
  ('นายธีรยุทธ บุญมี', 'บจก. ไทยคอนสตรัคชั่น', 'ผ่าน 3/3', 'pending_docs', '5-6603-xxxxx-51', 'ผู้ปฏิบัติงานประจำ', 'ระดับ 2', 'CT-2569-0480', '31 ส.ค. 2570', 'ช่างกลโรงงาน', ARRAY['งานเครื่องจักร', 'งานยกของหนัก', 'พื้นที่ผลิต C'], 'ok')
ON CONFLICT (card_no) DO NOTHING;

INSERT INTO courses (code, name, detail, pass_rate, taken) VALUES
  ('TR-101', 'ความปลอดภัยพื้นฐานสำหรับผู้รับเหมา', 'บังคับทุกคนก่อนเข้าพื้นที่ — อายุใบรับรอง 1 ปี', 92, 512),
  ('TR-204', 'งานที่มีความร้อนและการเฝ้าระวังไฟ', 'บังคับสำหรับช่างเชื่อมและผู้เฝ้าระวังไฟ', 84, 186),
  ('TR-206', 'การทำงานในที่อับอากาศ', 'รวมการตรวจวัดบรรยากาศและแผนกู้ภัย', 76, 94),
  ('TR-208', 'การทำงานบนที่สูงและการใช้อุปกรณ์ยึด', 'ภาคปฏิบัติ 3 ชั่วโมง ณ ศูนย์ฝึก', 81, 148),
  ('TR-212', 'งานไฟฟ้าและการตัดแยกพลังงาน (LOTO)', 'บังคับสำหรับช่างไฟฟ้าและผู้ควบคุมงานไฟฟ้า', 90, 71)
ON CONFLICT (code) DO NOTHING;

INSERT INTO exam_results (name, company, course_code, taken_on, score, result)
SELECT v.name, v.company, v.course_code, v.taken_on::date, v.score, v.result
FROM (VALUES
  ('นายวิชัย ทองสุข', 'บจก. เอส.พี. เอ็นจิเนียริ่ง', 'TR-204', '2026-09-12', 95, 'pass'),
  ('นายอนุชา ศรีสมบัติ', 'บจก. พี.เค. เซอร์วิส', 'TR-206', '2026-09-12', 88, 'pass'),
  ('นายสมพงษ์ แก้วมณี', 'บจก. ไทยคอนสตรัคชั่น', 'TR-208', '2026-09-11', 72, 'fail'),
  ('นางสาวปิยะดา นิลกุล', 'บจก. คลีนโปร แมเนจเมนท์', 'TR-101', '2026-09-11', 90, 'pass'),
  ('นายธีรยุทธ บุญมี', 'บจก. ไทยคอนสตรัคชั่น', 'TR-204', '2026-09-10', 86, 'pass'),
  ('นายเอกชัย พูลผล', 'บจก. เอส.พี. เอ็นจิเนียริ่ง', 'TR-101', '2026-09-10', 78, 'retest'),
  ('นายกิตติศักดิ์ วัฒนา', 'บจก. อีเล็คโทร พลัส', 'TR-212', '2026-09-09', 94, 'pass')
) AS v(name, company, course_code, taken_on, score, result)
WHERE NOT EXISTS (SELECT 1 FROM exam_results);

INSERT INTO alerts (title, detail, severity, created_at)
SELECT v.title, v.detail, v.severity, now() - v.ago::interval
FROM (VALUES
  ('ตรวจวัดก๊าซเกินเกณฑ์ — ถัง T-204', 'WP-2569-0914-002 ระงับงานชั่วคราว รอตรวจซ้ำ', 'bad', '30 minutes'),
  ('Permit ใกล้หมดอายุ 3 ใบ', 'พื้นที่หน่วยผลิต B — ต้องปิดงานภายใน 2 ชั่วโมง', 'warn', '1 hour'),
  ('บัตรผู้รับเหมาหมดอายุ 7 ใบ', 'บจก. เอส.พี. เอ็นจิเนียริ่ง — ต้องอบรมทบทวนก่อนต่อบัตร', 'warn', '1 day'),
  ('ประกันภัยผู้รับเหมาหมดอายุ', 'บจก. พี.เค. เซอร์วิส — กรมธรรม์สิ้นสุด 30 ก.ย. 2569', 'info', '1 day 2 hours')
) AS v(title, detail, severity, ago)
WHERE NOT EXISTS (SELECT 1 FROM alerts);

INSERT INTO findings (category, contractor_id, found_on, resolved)
SELECT f.category, c.id, DATE '2026-04-01' + ((s.g * 37) % 168), NOT (s.g = 1 AND f.n >= 13)
FROM (VALUES
  ('ไม่ติดป้ายเตือนเขตปฏิบัติงาน', 24),
  ('PPE ไม่ครบตามที่ระบุในใบอนุญาต', 19),
  ('ไม่ตรวจวัดก๊าซซ้ำตามรอบเวลา', 13),
  ('อุปกรณ์ดับเพลิงไม่พร้อมใช้ ณ จุดงาน', 9),
  ('เอกสารใบอนุญาตไม่แสดงที่หน้างาน', 7)
) AS f(category, n)
CROSS JOIN LATERAL generate_series(1, f.n) AS s(g)
JOIN (SELECT id, row_number() OVER (ORDER BY code) - 1 AS rn FROM contractors) AS c
  ON c.rn = s.g % (SELECT count(*) FROM contractors)
WHERE NOT EXISTS (SELECT 1 FROM findings);

INSERT INTO monthly_reports (month, safe_hours, near_misses, on_time_close_pct) VALUES
  ('2026-07-01', 42100, 8, 92),
  ('2026-08-01', 48200, 11, 96)
ON CONFLICT (month) DO NOTHING;

INSERT INTO recommendations (title, detail, priority, sort)
SELECT v.title, v.detail, v.priority, v.sort
FROM (VALUES
  ('เพิ่มรอบตรวจพื้นที่งานความร้อนเป็น 2 ครั้งต่อกะ', 'งานความร้อนคิดเป็น 24% ของ permit ทั้งหมด และเป็นแหล่งข้อบกพร่องอันดับหนึ่ง', 'high', 1),
  ('บังคับอบรมทบทวนก่อนต่อบัตรทุกกรณี', 'พบบัตรหมดอายุ 7 ใบจากผู้รับเหมารายเดิมในเดือนนี้', 'high', 2),
  ('ติดตั้งจุดตรวจวัดก๊าซประจำพื้นที่ถังเก็บ', 'ลดภาระการตรวจวัดซ้ำและปิดช่องว่างการบันทึกผล', 'medium', 3),
  ('ทบทวนเงื่อนไขประกันภัยในสัญญาผู้รับเหมา', 'ผู้รับเหมา 5 รายมีกรมธรรม์หมดอายุภายในไตรมาสนี้', 'medium', 4)
) AS v(title, detail, priority, sort)
WHERE NOT EXISTS (SELECT 1 FROM recommendations);
