-- Create contractors table
CREATE TABLE contractors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  initials TEXT NOT NULL,
  code TEXT UNIQUE NOT NULL,
  scope TEXT NOT NULL,
  workers INTEGER NOT NULL,
  insurance TEXT NOT NULL,
  cards TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'ok',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create permits table
CREATE TABLE permits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  permit_no TEXT UNIQUE NOT NULL,
  type TEXT NOT NULL,
  contractor_id UUID NOT NULL REFERENCES contractors(id),
  area TEXT NOT NULL,
  risk TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create badges table
CREATE TABLE badges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  company TEXT NOT NULL,
  training TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create users table
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'contractor',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Enable Row Level Security (RLS)
ALTER TABLE contractors ENABLE ROW LEVEL SECURITY;
ALTER TABLE permits ENABLE ROW LEVEL SECURITY;
ALTER TABLE badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Create policies (allow anonymous read)
CREATE POLICY "Enable read access for all users" ON contractors
  FOR SELECT USING (true);

CREATE POLICY "Enable read access for all users" ON permits
  FOR SELECT USING (true);

CREATE POLICY "Enable read access for all users" ON badges
  FOR SELECT USING (true);

-- RLS policies alone are not enough: the anon role also needs table privileges
GRANT SELECT ON public.contractors, public.permits, public.badges TO anon;

-- Insert sample data
INSERT INTO contractors (name, initials, code, scope, workers, insurance, cards, status) VALUES
  ('บจก. เอส.พี. เอ็นจิเนียริ่ง', 'SP', 'CTR-0118', 'งานเครื่องกล', 142, '31 ธ.ค. 2569', '138 / 142', 'ok'),
  ('บจก. ไทยคอนสตรัคชั่น', 'TC', 'CTR-0092', 'งานโครงสร้าง', 96, '31 มี.ค. 2570', '91 / 96', 'ok'),
  ('บจก. พี.เค. เซอร์วิส', 'PK', 'CTR-0203', 'งานทำความสะอาดถัง', 58, '30 ก.ย. 2569', '52 / 58', 'warn');

INSERT INTO permits (permit_no, type, contractor_id, area, risk, status) VALUES
  ('WP-2569-0914-001', 'งานที่มีความร้อน', (SELECT id FROM contractors WHERE code = 'CTR-0118'), 'หน่วยผลิต A', 'สูง', 'active'),
  ('WP-2569-0914-002', 'งานในที่อับอากาศ', (SELECT id FROM contractors WHERE code = 'CTR-0203'), 'คลังวัตถุดิบ', 'สูง', 'suspended');
