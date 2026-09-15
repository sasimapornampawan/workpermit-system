import { C, type Tone } from './theme';

export type Screen = 'dashboard' | 'contractors' | 'badges' | 'training' | 'permits' | 'reports';

export const NAV: { id: Screen; label: string; en: string; count?: string }[] = [
  { id: 'dashboard', label: 'แดชบอร์ด', en: 'Dashboard' },
  { id: 'contractors', label: 'ผู้รับเหมา', en: 'Contractors', count: '42' },
  { id: 'badges', label: 'บัตรผู้รับเหมา', en: 'ID Badges', count: '9' },
  { id: 'training', label: 'อบรม & ทดสอบ', en: 'Training & Exam' },
  { id: 'permits', label: 'ขอ Work Permit', en: 'Permit Request', count: '6' },
  { id: 'reports', label: 'รายงานผู้บริหาร', en: 'Reports' },
];

export const SCREEN_META: Record<Screen, [title: string, subtitle: string]> = {
  dashboard: ['ภาพรวมความปลอดภัยประจำวัน', 'ข้อมูลล่าสุด 14 กันยายน 2569 — โรงงานระยอง'],
  contractors: ['ทะเบียนผู้รับเหมา', 'ข้อมูลบริษัท พนักงาน ประกันภัย และสถานะการขึ้นทะเบียน'],
  badges: ['การออกบัตรผู้รับเหมา', 'ตรวจสอบคุณสมบัติ ออกบัตร และควบคุมอายุบัตร'],
  training: ['การอบรมและทดสอบ', 'หลักสูตรความปลอดภัย ผลสอบ และอายุใบรับรอง'],
  permits: ['ขอใบอนุญาตทำงาน', 'แบบฟอร์ม 4 ขั้นตอน พร้อมการชี้บ่งอันตรายและลำดับอนุมัติ'],
  reports: ['รายงานสรุปผู้บริหาร', 'สรุปรายเดือน พร้อมแนวโน้มและข้อเสนอเชิงนโยบาย'],
};

/* ---------- Dashboard ---------- */

export const KPIS = [
  { label: 'Permit ที่ใช้งานอยู่', value: '38', delta: '+6', deltaColor: C.accFg, note: 'จาก 42 ใบที่อนุมัติวันนี้', dot: C.acc },
  { label: 'รออนุมัติ', value: '6', delta: '2 เกินกำหนด', deltaColor: C.ambFg, note: 'รอ ผจก.พื้นที่ 4 ใบ', dot: C.amb },
  { label: 'ผู้รับเหมาในพื้นที่', value: '214', delta: '+18', deltaColor: C.grnFg, note: 'บัตรผ่านการตรวจสอบทั้งหมด', dot: C.grn },
  { label: 'ข้อบกพร่องค้างแก้ไข', value: '4', delta: '-3', deltaColor: C.grnFg, note: 'เกินกำหนดแก้ไข 1 รายการ', dot: C.red },
];

export const TYPE_BARS = [
  { label: 'งานที่มีความร้อน', value: 74, pct: '100%', color: 'oklch(0.52 0.16 265)' },
  { label: 'งานบนที่สูง', value: 58, pct: '78%', color: 'oklch(0.56 0.15 265)' },
  { label: 'งานระบบไฟฟ้า / LOTO', value: 41, pct: '55%', color: 'oklch(0.6 0.13 265)' },
  { label: 'งานในที่อับอากาศ', value: 33, pct: '45%', color: 'oklch(0.64 0.12 265)' },
  { label: 'งานยกของหนัก', value: 27, pct: '36%', color: 'oklch(0.68 0.1 265)' },
  { label: 'งานขุดเจาะและงานดิน', value: 21, pct: '28%', color: 'oklch(0.72 0.08 265)' },
  { label: 'งานสารเคมีอันตราย', value: 14, pct: '19%', color: 'oklch(0.76 0.06 265)' },
];

export const ALERTS: { title: string; detail: string; time: string; tone: Tone }[] = [
  { title: 'ตรวจวัดก๊าซเกินเกณฑ์ — ถัง T-204', detail: 'WP-2569-0914-002 ระงับงานชั่วคราว รอตรวจซ้ำ', time: '09:12', tone: 'bad' },
  { title: 'Permit ใกล้หมดอายุ 3 ใบ', detail: 'พื้นที่หน่วยผลิต B — ต้องปิดงานภายใน 2 ชั่วโมง', time: '08:40', tone: 'warn' },
  { title: 'บัตรผู้รับเหมาหมดอายุ 7 ใบ', detail: 'บจก. เอส.พี. เอ็นจิเนียริ่ง — ต้องอบรมทบทวนก่อนต่อบัตร', time: 'เมื่อวาน', tone: 'warn' },
  { title: 'ประกันภัยผู้รับเหมาหมดอายุ', detail: 'บจก. พี.เค. เซอร์วิส — กรมธรรม์สิ้นสุด 30 ก.ย. 2569', time: 'เมื่อวาน', tone: 'info' },
];

export const DASH_FILTERS = ['ทั้งหมด', 'ความเสี่ยงสูง', 'ใกล้หมดอายุ'];

export const PERMIT_ROWS: { id: string; type: string; contractor: string; area: string; risk: string; riskTone: Tone; time: string; status: string; statusTone: Tone }[] = [
  { id: 'WP-2569-0914-001', type: 'งานที่มีความร้อน — เชื่อมท่อไอน้ำ', contractor: 'บจก. เอส.พี. เอ็นจิเนียริ่ง', area: 'หน่วยผลิต A — ชั้น 2', risk: 'สูง', riskTone: 'bad', time: '08:00–17:00', status: 'กำลังทำงาน', statusTone: 'ok' },
  { id: 'WP-2569-0914-002', type: 'งานในที่อับอากาศ — ล้างถัง T-204', contractor: 'บจก. พี.เค. เซอร์วิส', area: 'คลังวัตถุดิบ', risk: 'สูง', riskTone: 'bad', time: '07:30–12:00', status: 'ระงับงาน', statusTone: 'bad' },
  { id: 'WP-2569-0914-003', type: 'งานบนที่สูง — เปลี่ยนหลังคา', contractor: 'บจก. ไทยคอนสตรัคชั่น', area: 'อาคารคลังสินค้า 3', risk: 'สูง', riskTone: 'bad', time: '08:00–16:00', status: 'กำลังทำงาน', statusTone: 'ok' },
  { id: 'WP-2569-0914-004', type: 'งานระบบไฟฟ้า — เปลี่ยนเบรกเกอร์', contractor: 'บจก. อีเล็คโทร พลัส', area: 'ห้องไฟฟ้า MDB-2', risk: 'ปานกลาง', riskTone: 'warn', time: '09:00–15:00', status: 'รออนุมัติ', statusTone: 'warn' },
  { id: 'WP-2569-0914-005', type: 'งานยกของหนัก — ติดตั้งปั๊ม', contractor: 'บจก. เอส.พี. เอ็นจิเนียริ่ง', area: 'ลานเครื่องจักร', risk: 'ปานกลาง', riskTone: 'warn', time: '13:00–18:00', status: 'อนุมัติแล้ว', statusTone: 'info' },
  { id: 'WP-2569-0914-006', type: 'งานทั่วไป — ทำความสะอาดท่อระบาย', contractor: 'บจก. คลีนโปร แมเนจเมนท์', area: 'รอบอาคารผลิต', risk: 'ต่ำ', riskTone: 'ok', time: '08:00–17:00', status: 'กำลังทำงาน', statusTone: 'ok' },
  { id: 'WP-2569-0913-018', type: 'งานสารเคมี — ถ่ายเทกรด', contractor: 'บจก. เคมแคร์', area: 'คลังสารเคมี', risk: 'ปานกลาง', riskTone: 'warn', time: 'ปิดงาน 16:45', status: 'ปิดงานแล้ว', statusTone: 'flat' },
];

/* ---------- Contractors ---------- */

export const CONTRACTOR_KPIS = [
  { label: 'ผู้รับเหมาที่ขึ้นทะเบียน', value: '42' },
  { label: 'พนักงานผู้รับเหมาทั้งหมด', value: '618' },
  { label: 'ประกันภัยใกล้หมดอายุ', value: '5' },
  { label: 'ระงับการทำงาน', value: '2' },
];

export const CONTRACTORS: { name: string; initials: string; code: string; scope: string; workers: number; insurance: string; insTone: Tone; cards: string; status: string; statusTone: Tone }[] = [
  { name: 'บจก. เอส.พี. เอ็นจิเนียริ่ง', initials: 'SP', code: 'CTR-0118', scope: 'งานเครื่องกล', workers: 142, insurance: '31 ธ.ค. 2569', insTone: 'ok', cards: '138 / 142', status: 'ใช้งานได้', statusTone: 'ok' },
  { name: 'บจก. ไทยคอนสตรัคชั่น', initials: 'TC', code: 'CTR-0092', scope: 'งานโครงสร้าง', workers: 96, insurance: '31 มี.ค. 2570', insTone: 'ok', cards: '91 / 96', status: 'ใช้งานได้', statusTone: 'ok' },
  { name: 'บจก. พี.เค. เซอร์วิส', initials: 'PK', code: 'CTR-0203', scope: 'งานทำความสะอาดถัง', workers: 58, insurance: '30 ก.ย. 2569', insTone: 'warn', cards: '52 / 58', status: 'เฝ้าระวัง', statusTone: 'warn' },
  { name: 'บจก. อีเล็คโทร พลัส', initials: 'EP', code: 'CTR-0147', scope: 'งานไฟฟ้า', workers: 44, insurance: '30 มิ.ย. 2570', insTone: 'ok', cards: '44 / 44', status: 'ใช้งานได้', statusTone: 'ok' },
  { name: 'บจก. คลีนโปร แมเนจเมนท์', initials: 'CP', code: 'CTR-0231', scope: 'งานสนับสนุน', workers: 88, insurance: '31 ม.ค. 2570', insTone: 'ok', cards: '80 / 88', status: 'ใช้งานได้', statusTone: 'ok' },
  { name: 'บจก. เคมแคร์', initials: 'CC', code: 'CTR-0175', scope: 'งานสารเคมี', workers: 36, insurance: '15 ต.ค. 2569', insTone: 'warn', cards: '30 / 36', status: 'เฝ้าระวัง', statusTone: 'warn' },
  { name: 'บจก. ไฮไรส์ เวิร์ค', initials: 'HR', code: 'CTR-0260', scope: 'งานบนที่สูง', workers: 27, insurance: '20 ส.ค. 2569', insTone: 'bad', cards: '0 / 27', status: 'ระงับ', statusTone: 'bad' },
];

/* ---------- Badges ---------- */

export type BadgeRequest = {
  name: string; idNo: string; company: string; training: string; trainingTone: Tone; kind: string;
  status: string; statusTone: Tone; tier: string; cardNo: string; expiry: string; role: string; perms: string[];
};

export const BADGE_QUEUE: BadgeRequest[] = [
  { name: 'นายวิชัย ทองสุข', idNo: '1-3299-xxxxx-42', company: 'บจก. เอส.พี. เอ็นจิเนียริ่ง', training: 'ผ่าน 3/3', trainingTone: 'ok', kind: 'ผู้ปฏิบัติงานประจำ', status: 'พร้อมออกบัตร', statusTone: 'ok', tier: 'ระดับ 2', cardNo: 'CT-2569-0418', expiry: '31 ส.ค. 2570', role: 'ช่างเชื่อม', perms: ['งานความร้อน', 'งานที่สูง', 'งานไฟฟ้าแรงต่ำ', 'พื้นที่ผลิต A-C'] },
  { name: 'นายสมพงษ์ แก้วมณี', idNo: '1-1015-xxxxx-08', company: 'บจก. ไทยคอนสตรัคชั่น', training: 'ผ่าน 2/3', trainingTone: 'warn', kind: 'ผู้ปฏิบัติงานชั่วคราว', status: 'รออบรมเพิ่ม', statusTone: 'warn', tier: 'ระดับ 1', cardNo: 'CT-2569-0455', expiry: '30 ก.ย. 2569', role: 'ช่างทั่วไป', perms: ['งานทั่วไป', 'พื้นที่ผลิต A'] },
  { name: 'นายอนุชา ศรีสมบัติ', idNo: '3-7701-xxxxx-15', company: 'บจก. พี.เค. เซอร์วิส', training: 'ผ่าน 3/3', trainingTone: 'ok', kind: 'ผู้ควบคุมงาน', status: 'พร้อมออกบัตร', statusTone: 'ok', tier: 'ผู้ควบคุมงาน', cardNo: 'CT-2569-0460', expiry: '31 ส.ค. 2570', role: 'หัวหน้าชุดงาน', perms: ['ที่อับอากาศ', 'งานความร้อน', 'ผู้ควบคุมงาน', 'ทุกพื้นที่ผลิต'] },
  { name: 'นายเอกชัย พูลผล', idNo: '1-4402-xxxxx-77', company: 'บจก. เอส.พี. เอ็นจิเนียริ่ง', training: 'หมดอายุ', trainingTone: 'bad', kind: 'ผู้ปฏิบัติงานประจำ', status: 'ตีกลับ', statusTone: 'bad', tier: 'ระดับ 2', cardNo: 'CT-2568-0902', expiry: '12 ก.ย. 2569', role: 'ช่างไฟฟ้า', perms: ['งานไฟฟ้า', 'พื้นที่ผลิต B'] },
  { name: 'นางสาวปิยะดา นิลกุล', idNo: '1-2204-xxxxx-30', company: 'บจก. คลีนโปร แมเนจเมนท์', training: 'ผ่าน 2/2', trainingTone: 'ok', kind: 'ผู้ปฏิบัติงานประจำ', status: 'พร้อมออกบัตร', statusTone: 'ok', tier: 'ระดับ 1', cardNo: 'CT-2569-0471', expiry: '31 ส.ค. 2570', role: 'พนักงานทำความสะอาด', perms: ['งานทั่วไป', 'พื้นที่สำนักงาน', 'พื้นที่ผลิต A'] },
  { name: 'นายธีรยุทธ บุญมี', idNo: '5-6603-xxxxx-51', company: 'บจก. ไทยคอนสตรัคชั่น', training: 'ผ่าน 3/3', trainingTone: 'ok', kind: 'ผู้ปฏิบัติงานประจำ', status: 'รอเอกสาร', statusTone: 'warn', tier: 'ระดับ 2', cardNo: 'CT-2569-0480', expiry: '31 ส.ค. 2570', role: 'ช่างกลโรงงาน', perms: ['งานเครื่องจักร', 'งานยกของหนัก', 'พื้นที่ผลิต C'] },
];

export const BADGE_CHECKS = [
  { ok: true, label: 'เอกสารประจำตัวครบถ้วน', detail: 'สำเนาบัตรประชาชน + ทะเบียนบ้าน' },
  { ok: true, label: 'ผลตรวจสุขภาพ', detail: 'ตรวจ 12 มี.ค. 2569 — ผ่าน' },
  { ok: true, label: 'ผ่านการอบรมความปลอดภัยพื้นฐาน', detail: 'คะแนน 92% — 5 ก.ย. 2569' },
  { ok: false, label: 'ประกันภัยของบริษัทผู้รับเหมา', detail: 'หมดอายุ 30 ก.ย. 2569 — ต่ออายุก่อนออกบัตร' },
];

/* ---------- Training ---------- */

export const COURSES = [
  { name: 'ความปลอดภัยพื้นฐานสำหรับผู้รับเหมา', code: 'TR-101', detail: 'บังคับทุกคนก่อนเข้าพื้นที่ — อายุใบรับรอง 1 ปี', rate: '92%', color: C.grn, taken: 512 },
  { name: 'งานที่มีความร้อนและการเฝ้าระวังไฟ', code: 'TR-204', detail: 'บังคับสำหรับช่างเชื่อมและผู้เฝ้าระวังไฟ', rate: '84%', color: C.acc, taken: 186 },
  { name: 'การทำงานในที่อับอากาศ', code: 'TR-206', detail: 'รวมการตรวจวัดบรรยากาศและแผนกู้ภัย', rate: '76%', color: C.amb, taken: 94 },
  { name: 'การทำงานบนที่สูงและการใช้อุปกรณ์ยึด', code: 'TR-208', detail: 'ภาคปฏิบัติ 3 ชั่วโมง ณ ศูนย์ฝึก', rate: '81%', color: C.acc, taken: 148 },
];

export const EXAM_ROWS: { name: string; company: string; course: string; date: string; score: string; result: string; tone: Tone }[] = [
  { name: 'นายวิชัย ทองสุข', company: 'บจก. เอส.พี. เอ็นจิเนียริ่ง', course: 'งานที่มีความร้อน (TR-204)', date: '12 ก.ย. 2569', score: '95%', result: 'ผ่าน', tone: 'ok' },
  { name: 'นายอนุชา ศรีสมบัติ', company: 'บจก. พี.เค. เซอร์วิส', course: 'ที่อับอากาศ (TR-206)', date: '12 ก.ย. 2569', score: '88%', result: 'ผ่าน', tone: 'ok' },
  { name: 'นายสมพงษ์ แก้วมณี', company: 'บจก. ไทยคอนสตรัคชั่น', course: 'งานบนที่สูง (TR-208)', date: '11 ก.ย. 2569', score: '72%', result: 'ไม่ผ่าน', tone: 'bad' },
  { name: 'นางสาวปิยะดา นิลกุล', company: 'บจก. คลีนโปร แมเนจเมนท์', course: 'ความปลอดภัยพื้นฐาน (TR-101)', date: '11 ก.ย. 2569', score: '90%', result: 'ผ่าน', tone: 'ok' },
  { name: 'นายธีรยุทธ บุญมี', company: 'บจก. ไทยคอนสตรัคชั่น', course: 'งานที่มีความร้อน (TR-204)', date: '10 ก.ย. 2569', score: '86%', result: 'ผ่าน', tone: 'ok' },
  { name: 'นายเอกชัย พูลผล', company: 'บจก. เอส.พี. เอ็นจิเนียริ่ง', course: 'ความปลอดภัยพื้นฐาน (TR-101)', date: '10 ก.ย. 2569', score: '78%', result: 'สอบซ้ำ', tone: 'warn' },
  { name: 'นายกิตติศักดิ์ วัฒนา', company: 'บจก. อีเล็คโทร พลัส', course: 'งานไฟฟ้า / LOTO (TR-212)', date: '9 ก.ย. 2569', score: '94%', result: 'ผ่าน', tone: 'ok' },
];

export const QUIZ_QUESTION = 'ก่อนเริ่มงานที่มีความร้อนและประกายไฟ (Hot Work) ผู้ปฏิบัติงานต้องดำเนินการข้อใดก่อนเป็นอันดับแรก';

export const QUIZ_OPTIONS = [
  { key: 'ก', text: 'ขออนุญาตงานความร้อนและตรวจวัดก๊าซติดไฟในพื้นที่ก่อนเริ่มงาน' },
  { key: 'ข', text: 'เริ่มงานได้ทันทีหากมีถังดับเพลิงอยู่ใกล้จุดทำงาน' },
  { key: 'ค', text: 'แจ้งหัวหน้างานทางวาจาเพียงอย่างเดียว' },
  { key: 'ง', text: 'ตรวจสอบเครื่องเชื่อมหลังเลิกงานแล้วจึงบันทึกผล' },
];

/** Lesson video length in seconds */
export const VIDEO_LENGTH = 760;

/* ---------- Permit request ---------- */

export const STEPS = [
  { n: 1, label: 'ประเภทงาน', hint: 'เลือกชนิดใบอนุญาต' },
  { n: 2, label: 'รายละเอียดงาน', hint: 'พื้นที่ เวลา ผู้รับเหมา' },
  { n: 3, label: 'ประเมินความเสี่ยง', hint: 'JSA และ PPE' },
  { n: 4, label: 'ผู้ปฏิบัติงาน & อนุมัติ', hint: 'ตรวจบัตรและส่งอนุมัติ' },
];

export const PERMIT_TYPES: { name: string; detail: string; level: string; tone: Tone; code: string }[] = [
  { name: 'งานที่มีความร้อนและประกายไฟ', detail: 'ตัด เชื่อม เจียร งานที่ก่อให้เกิดประกายไฟในพื้นที่ควบคุม', level: 'ความเสี่ยงสูง', tone: 'bad', code: 'HW-01' },
  { name: 'งานในที่อับอากาศ', detail: 'ถัง ไซโล ท่อ บ่อพัก ต้องตรวจวัดบรรยากาศและมีผู้เฝ้าระวัง', level: 'ความเสี่ยงสูง', tone: 'bad', code: 'CS-02' },
  { name: 'งานบนที่สูง', detail: 'ทำงานสูงเกิน 2 เมตร นั่งร้าน กระเช้า และจุดยึดเข็มขัด', level: 'ความเสี่ยงสูง', tone: 'bad', code: 'WH-03' },
  { name: 'งานระบบไฟฟ้า / LOTO', detail: 'ตัดแยกพลังงาน ล็อกและแขวนป้าย ทดสอบแรงดันก่อนเริ่มงาน', level: 'ความเสี่ยงปานกลาง', tone: 'warn', code: 'EL-04' },
  { name: 'งานขุดเจาะและงานดิน', detail: 'ขุดลึกเกิน 1.5 เมตร ตรวจแนวท่อและสาธารณูปโภคใต้ดิน', level: 'ความเสี่ยงปานกลาง', tone: 'warn', code: 'EX-05' },
  { name: 'งานยกของหนักด้วยเครน', detail: 'แผนการยก ตรวจสลิง และกำหนดเขตห้ามเข้าใต้แนวยก', level: 'ความเสี่ยงปานกลาง', tone: 'warn', code: 'LF-06' },
  { name: 'งานสารเคมีอันตราย', detail: 'ถ่ายเท จัดเก็บ ทำความสะอาดสารเคมี พร้อม SDS ประจำจุดงาน', level: 'ความเสี่ยงปานกลาง', tone: 'warn', code: 'CH-07' },
  { name: 'งานทั่วไปในพื้นที่ผลิต', detail: 'งานบำรุงรักษาที่ไม่เข้าข่ายงานเสี่ยงสูง', level: 'ความเสี่ยงต่ำ', tone: 'ok', code: 'GN-08' },
];

export const DRAFT_PERMIT_NO = 'WP-2569-0912-014';

export const FORM_FIELDS = [
  { label: 'เลขที่ใบอนุญาต', value: DRAFT_PERMIT_NO, wide: false },
  { label: 'วันที่ขออนุญาต', value: '14 กันยายน 2569', wide: false },
  { label: 'บริษัทผู้รับเหมา', value: 'บจก. เอส.พี. เอ็นจิเนียริ่ง (CTR-0118)', wide: false },
  { label: 'ผู้ควบคุมงาน', value: 'นายอนุชา ศรีสมบัติ — CT-2569-0460', wide: false },
  { label: 'พื้นที่ปฏิบัติงาน', value: 'หน่วยผลิต A — ชั้น 2 ใกล้ท่อไอน้ำ HS-12', wide: true },
  { label: 'ลักษณะงานโดยละเอียด', value: 'ตัดและเชื่อมท่อไอน้ำขนาด 4 นิ้ว เปลี่ยนวาล์วควบคุม พร้อมทดสอบแรงดันหลังติดตั้ง', wide: true },
  { label: 'วันเริ่ม — เวลา', value: '15 ก.ย. 2569  08:00', wide: false },
  { label: 'วันสิ้นสุด — เวลา', value: '15 ก.ย. 2569  17:00', wide: false },
  { label: 'จำนวนผู้ปฏิบัติงาน', value: '5 คน', wide: false },
  { label: 'เจ้าของพื้นที่ผู้อนุญาต', value: 'ฝ่ายผลิต A — นายประสิทธิ์ มั่นคง', wide: false },
];

export const ATTACHMENTS = [
  { ok: true, label: 'แผนการปฏิบัติงาน (Method Statement)', file: 'method-statement-hs12.pdf' },
  { ok: true, label: 'ผลการตรวจวัดก๊าซ', file: 'gas-test-20690915-0730.pdf' },
  { ok: true, label: 'ใบรับรองการอบรมผู้ปฏิบัติงาน', file: 'training-cert-5-persons.pdf' },
  { ok: true, label: 'ใบตรวจสอบเครื่องมือและอุปกรณ์', file: 'tool-inspection-0914.pdf' },
  { ok: false, label: 'กรมธรรม์ประกันภัยที่ยังไม่หมดอายุ', file: 'ยังไม่ได้แนบไฟล์' },
];

export const HAZARDS: { hazard: string; control: string; level: string; tone: Tone }[] = [
  { hazard: 'ประกายไฟติดวัสดุไวไฟ', control: 'เคลื่อนย้ายวัสดุไวไฟออกรัศมี 11 เมตร คลุมผ้ากันไฟ จัดผู้เฝ้าระวังไฟ', level: 'สูง', tone: 'bad' },
  { hazard: 'ไอระเหยสารไวไฟในพื้นที่', control: 'ตรวจวัดก๊าซก่อนเริ่มงานและทุก 2 ชั่วโมง ต้องต่ำกว่า 10% LEL', level: 'สูง', tone: 'bad' },
  { hazard: 'ควันเชื่อมและฟูมโลหะ', control: 'ติดตั้งพัดลมดูดอากาศเฉพาะจุด สวมหน้ากากกรองฟูม', level: 'ปานกลาง', tone: 'warn' },
  { hazard: 'พลังงานความร้อนและไอน้ำค้างในระบบ', control: 'ตัดแยกพลังงาน ระบายแรงดัน ล็อกและแขวนป้าย (LOTO)', level: 'สูง', tone: 'bad' },
  { hazard: 'ตกจากบันไดและนั่งร้าน', control: 'ใช้นั่งร้านที่ผ่านการตรวจ ติดป้ายสีเขียว และสวมเข็มขัดนิรภัยแบบเต็มตัว', level: 'ปานกลาง', tone: 'warn' },
];

export const PPE = [
  { label: 'หมวกนิรภัย', required: true }, { label: 'แว่นตานิรภัย', required: true },
  { label: 'หน้ากากเชื่อม', required: true }, { label: 'ถุงมือหนัง', required: true },
  { label: 'ชุดกันประกายไฟ', required: true }, { label: 'รองเท้านิรภัย', required: true },
  { label: 'หน้ากากกรองฟูม', required: true }, { label: 'เข็มขัดนิรภัยเต็มตัว', required: true },
  { label: 'ที่อุดหูลดเสียง', required: false }, { label: 'ชุดป้องกันสารเคมี', required: false },
];

export const PERMIT_WORKERS: { name: string; card: string; courses: string; status: string; tone: Tone }[] = [
  { name: 'นายอนุชา ศรีสมบัติ', card: 'CT-2569-0460', courses: 'TR-101, TR-204, TR-206', status: 'ผ่าน', tone: 'ok' },
  { name: 'นายวิชัย ทองสุข', card: 'CT-2569-0418', courses: 'TR-101, TR-204, TR-208', status: 'ผ่าน', tone: 'ok' },
  { name: 'นายธีรยุทธ บุญมี', card: 'CT-2569-0480', courses: 'TR-101, TR-204', status: 'ผ่าน', tone: 'ok' },
  { name: 'นายสมพงษ์ แก้วมณี', card: 'CT-2569-0455', courses: 'TR-101', status: 'ขาด TR-204', tone: 'warn' },
  { name: 'นายเอกชัย พูลผล', card: 'CT-2568-0902', courses: 'TR-101 (หมดอายุ)', status: 'บัตรหมดอายุ', tone: 'bad' },
];

/** ok = approved, warn = pending on this step, flat = not reached yet */
export const APPROVALS: { role: string; person: string; time: string; tone: 'ok' | 'warn' | 'flat' }[] = [
  { role: 'ผู้ขออนุญาต', person: 'นายอนุชา ศรีสมบัติ — ผู้ควบคุมงาน', time: '14 ก.ย. 2569 09:05', tone: 'ok' },
  { role: 'เจ้าหน้าที่ความปลอดภัย (จป.วิชาชีพ)', person: 'สมชาย อารักษ์', time: 'รอดำเนินการ', tone: 'warn' },
  { role: 'เจ้าของพื้นที่', person: 'ฝ่ายผลิต A — นายประสิทธิ์ มั่นคง', time: 'รอลำดับก่อนหน้า', tone: 'flat' },
  { role: 'ผู้จัดการโรงงาน', person: 'นายวีระพงษ์ เจริญสุข', time: 'เฉพาะงานความเสี่ยงสูง', tone: 'flat' },
];

/* ---------- Reports ---------- */

export const REPORT_STATS = [
  { label: 'Permit ที่ออกทั้งหมด', value: '312', delta: '+8%', deltaColor: C.accFg, note: 'เทียบกับเดือนก่อน 289 ใบ' },
  { label: 'ชั่วโมงทำงานปลอดอุบัติเหตุ', value: '48,200', delta: 'สะสม 214 วัน', deltaColor: C.grnFg, note: 'ไม่มีการหยุดงานจากอุบัติเหตุ' },
  { label: 'เหตุการณ์เกือบเกิดอุบัติเหตุ', value: '11', delta: '+3', deltaColor: C.ambFg, note: 'รายงานเพิ่มจากการรณรงค์แจ้งเหตุ' },
  { label: 'อัตราการปิดงานตรงเวลา', value: '96%', delta: '+4%', deltaColor: C.grnFg, note: 'ค้างปิด 12 ใบ แก้ไขครบแล้ว' },
  { label: 'ผู้รับเหมาที่ถูกระงับ', value: '2', delta: 'คงที่', deltaColor: C.mut, note: 'บัตรหมดอายุและประกันภัยขาด' },
];

export const MONTH_BARS = [
  { label: 'มี.ค.', value: 241, h: '62%', incH: '22%' },
  { label: 'เม.ย.', value: 198, h: '51%', incH: '18%' },
  { label: 'พ.ค.', value: 264, h: '68%', incH: '30%' },
  { label: 'มิ.ย.', value: 276, h: '71%', incH: '26%' },
  { label: 'ก.ค.', value: 289, h: '74%', incH: '34%' },
  { label: 'ส.ค.', value: 312, h: '100%', incH: '28%' },
];

export const FINDINGS = [
  { label: 'ไม่ติดป้ายเตือนเขตปฏิบัติงาน', value: 24, pct: '100%', color: 'oklch(0.6 0.16 40)' },
  { label: 'PPE ไม่ครบตามที่ระบุในใบอนุญาต', value: 19, pct: '79%', color: 'oklch(0.66 0.15 50)' },
  { label: 'ไม่ตรวจวัดก๊าซซ้ำตามรอบเวลา', value: 13, pct: '54%', color: 'oklch(0.72 0.14 62)' },
  { label: 'อุปกรณ์ดับเพลิงไม่พร้อมใช้ ณ จุดงาน', value: 9, pct: '38%', color: 'oklch(0.76 0.12 72)' },
  { label: 'เอกสารใบอนุญาตไม่แสดงที่หน้างาน', value: 7, pct: '29%', color: 'oklch(0.8 0.1 82)' },
];

export const RANKING: { name: string; permits: number; findings: number; score: string; tone: Tone }[] = [
  { name: 'บจก. อีเล็คโทร พลัส', permits: 62, findings: 1, score: '98', tone: 'ok' },
  { name: 'บจก. เอส.พี. เอ็นจิเนียริ่ง', permits: 104, findings: 6, score: '92', tone: 'ok' },
  { name: 'บจก. คลีนโปร แมเนจเมนท์', permits: 48, findings: 4, score: '89', tone: 'ok' },
  { name: 'บจก. ไทยคอนสตรัคชั่น', permits: 71, findings: 12, score: '78', tone: 'warn' },
  { name: 'บจก. ไฮไรส์ เวิร์ค', permits: 27, findings: 19, score: '61', tone: 'bad' },
];

export const RECOMMENDATIONS: { title: string; detail: string; priority: string; tone: Tone }[] = [
  { title: 'เพิ่มรอบตรวจพื้นที่งานความร้อนเป็น 2 ครั้งต่อกะ', detail: 'งานความร้อนคิดเป็น 24% ของ permit ทั้งหมด และเป็นแหล่งข้อบกพร่องอันดับหนึ่ง', priority: 'สูง', tone: 'bad' },
  { title: 'บังคับอบรมทบทวนก่อนต่อบัตรทุกกรณี', detail: 'พบบัตรหมดอายุ 7 ใบจากผู้รับเหมารายเดิมในเดือนนี้', priority: 'สูง', tone: 'bad' },
  { title: 'ติดตั้งจุดตรวจวัดก๊าซประจำพื้นที่ถังเก็บ', detail: 'ลดภาระการตรวจวัดซ้ำและปิดช่องว่างการบันทึกผล', priority: 'กลาง', tone: 'warn' },
  { title: 'ทบทวนเงื่อนไขประกันภัยในสัญญาผู้รับเหมา', detail: 'ผู้รับเหมา 5 รายมีกรมธรรม์หมดอายุภายในไตรมาสนี้', priority: 'กลาง', tone: 'warn' },
];
