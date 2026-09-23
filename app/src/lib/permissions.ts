/** Mirrors the permissions seeded by SUPABASE_PHASE14_PERMISSIONS.sql, which is what actually enforces them. */
export type PermissionKey =
  | 'manage_contractors' | 'manage_badges' | 'manage_courses' | 'run_exams' | 'request_permits' | 'approve_permits'
  | 'manage_permit_status' | 'manage_findings' | 'manage_alerts' | 'manage_reports_data' | 'view_reports' | 'manage_users';

export const PERMISSIONS: { key: PermissionKey; label: string; detail: string }[] = [
  { key: 'manage_contractors', label: 'จัดการผู้รับเหมา', detail: 'เพิ่ม แก้ไข และนำเข้าไฟล์ Excel' },
  { key: 'manage_badges', label: 'จัดการบัตรผู้รับเหมา', detail: 'สร้างคำขอ แก้ไข อัปโหลดรูป และออกบัตร' },
  { key: 'manage_courses', label: 'จัดการหลักสูตรอบรม', detail: 'เพิ่ม แก้ไข วิดีโอและข้อสอบ' },
  { key: 'run_exams', label: 'จัดสอบ', detail: 'เปิดวิดีโอและแบบทดสอบให้พนักงาน' },
  { key: 'request_permits', label: 'ขอ Work Permit', detail: 'ส่งคำขอและแนบเอกสาร' },
  { key: 'approve_permits', label: 'อนุมัติ Permit', detail: 'อนุมัติตามขั้นตอนของบทบาทตัวเอง' },
  { key: 'manage_permit_status', label: 'เปลี่ยนสถานะงาน', detail: 'เริ่มงาน ระงับงาน และปิดงาน' },
  { key: 'manage_findings', label: 'บันทึกข้อบกพร่อง', detail: 'บันทึก ปิด และลบข้อบกพร่อง' },
  { key: 'manage_alerts', label: 'จัดการแจ้งเตือน', detail: 'เพิ่มและปิดแจ้งเตือนบนแดชบอร์ด' },
  { key: 'manage_reports_data', label: 'บันทึกข้อมูลรายงาน', detail: 'ตัวเลขรายเดือนและข้อเสนอผู้บริหาร' },
  { key: 'view_reports', label: 'ดูรายงานผู้บริหาร', detail: 'เข้าเมนูรายงานและส่งออก PDF' },
  { key: 'manage_users', label: 'จัดการผู้ใช้', detail: 'สร้างบัญชี กำหนดบทบาทและสิทธิ์' },
];
