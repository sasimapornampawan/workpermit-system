import type { Tone } from './theme';

export type Screen = 'dashboard' | 'contractors' | 'badges' | 'training' | 'permits' | 'reports';

export const NAV: { id: Screen; label: string; en: string }[] = [
  { id: 'dashboard', label: 'แดชบอร์ด', en: 'Dashboard' },
  { id: 'contractors', label: 'ผู้รับเหมา', en: 'Contractors' },
  { id: 'badges', label: 'บัตรผู้รับเหมา', en: 'ID Badges' },
  { id: 'training', label: 'อบรม & ทดสอบ', en: 'Training & Exam' },
  { id: 'permits', label: 'ขอ Work Permit', en: 'Permit Request' },
  { id: 'reports', label: 'รายงานผู้บริหาร', en: 'Reports' },
];

export const SCREEN_META: Record<Screen, [title: string, subtitle: string]> = {
  dashboard: ['ภาพรวมความปลอดภัยประจำวัน', 'ข้อมูลจากฐานข้อมูลล่าสุด — โรงงานระยอง'],
  contractors: ['ทะเบียนผู้รับเหมา', 'ข้อมูลบริษัท พนักงาน ประกันภัย และสถานะการขึ้นทะเบียน'],
  badges: ['การออกบัตรผู้รับเหมา', 'ตรวจสอบคุณสมบัติ ออกบัตร และควบคุมอายุบัตร'],
  training: ['การอบรมและทดสอบ', 'หลักสูตรความปลอดภัย ผลสอบ และอายุใบรับรอง'],
  permits: ['ขอใบอนุญาตทำงาน', 'แบบฟอร์ม 4 ขั้นตอน พร้อมการชี้บ่งอันตรายและลำดับอนุมัติ'],
  reports: ['รายงานสรุปผู้บริหาร', 'สรุปรายเดือน พร้อมแนวโน้มและข้อเสนอเชิงนโยบาย'],
};

/* ---------- Dashboard ---------- */

export const DASH_FILTERS = ['ทั้งหมด', 'ความเสี่ยงสูง', 'ใกล้หมดอายุ'];

/* ---------- Badges ---------- */

export const BADGE_CHECKS = [
  { ok: true, label: 'เอกสารประจำตัวครบถ้วน', detail: 'สำเนาบัตรประชาชน + ทะเบียนบ้าน' },
  { ok: true, label: 'ผลตรวจสุขภาพ', detail: 'ตรวจ 12 มี.ค. 2569 — ผ่าน' },
  { ok: true, label: 'ผ่านการอบรมความปลอดภัยพื้นฐาน', detail: 'คะแนน 92% — 5 ก.ย. 2569' },
  { ok: false, label: 'ประกันภัยของบริษัทผู้รับเหมา', detail: 'หมดอายุ 30 ก.ย. 2569 — ต่ออายุก่อนออกบัตร' },
];

/* ---------- Training ---------- */

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
