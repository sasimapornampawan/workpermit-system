import { FunctionsHttpError, createClient } from '@supabase/supabase-js';
import type { Tone } from '../theme';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// createClient throws on an empty URL, which would blank the whole app when env vars are missing.
export const supabase = supabaseUrl && supabaseAnonKey ? createClient(supabaseUrl, supabaseAnonKey) : null;

export type Role = 'safety' | 'contractor' | 'area_owner' | 'manager';

export type Profile = { id: string; full_name: string; role: Role; contractor_id: string | null; must_change_password: boolean };

export const MIN_PASSWORD = 8;

export const ROLE_LABEL: Record<Role, string> = {
  safety: 'เจ้าหน้าที่ความปลอดภัย (จป.)',
  contractor: 'ผู้รับเหมา',
  area_owner: 'เจ้าของพื้นที่',
  manager: 'ผู้จัดการโรงงาน',
};

export const APPROVER_ROLES: Role[] = ['safety', 'area_owner', 'manager'];

export type AdminUser = {
  id: string;
  email: string;
  full_name: string | null;
  role: Role | null;
  active: boolean | null;
  contractor_id: string | null;
  contractor_name: string | null;
  created_at: string;
  last_sign_in_at: string | null;
};

const ADMIN_FUNCTION = 'admin-users';

async function adminFunctionError(error: unknown): Promise<string> {
  if (error instanceof FunctionsHttpError) {
    if (error.context.status === 404) return `ยังไม่ได้ติดตั้ง Edge Function "${ADMIN_FUNCTION}" ใน Supabase`;
    try {
      const payload = await error.context.json();
      return payload.error ?? error.message;
    } catch {
      return error.message;
    }
  }
  return `เชื่อมต่อ Edge Function "${ADMIN_FUNCTION}" ไม่ได้ ตรวจสอบว่าติดตั้งแล้ว`;
}

/** Calls the admin-users Edge Function (supabase/functions/admin-users). */
export async function callAdminFunction(body: Record<string, unknown>): Promise<{ data: Record<string, unknown> | null; error: string | null }> {
  if (!supabase) return { data: null, error: 'ยังไม่ได้ตั้งค่า Supabase' };
  const { data, error } = await supabase.functions.invoke(ADMIN_FUNCTION, { body });
  if (error) return { data: null, error: await adminFunctionError(error) };
  return { data: data as Record<string, unknown>, error: null };
}

/** Roles allowed to change a permit's status on site; the database enforces the same rule. */
export const STATUS_ROLES: Role[] = ['safety', 'area_owner'];

export type PermitAction = 'start' | 'suspend' | 'resume' | 'close';

/** Mirrors change_permit_status in SUPABASE_PHASE4_STATUS.sql, which is the authority. */
export const PERMIT_ACTIONS: Record<PermitAction, { label: string; from: string[]; needsNote: boolean }> = {
  start: { label: 'เริ่มงาน', from: ['approved'], needsNote: false },
  suspend: { label: 'ระงับงาน', from: ['active'], needsNote: true },
  resume: { label: 'กลับมาทำงาน', from: ['suspended'], needsNote: false },
  close: { label: 'ปิดงาน', from: ['active', 'suspended'], needsNote: false },
};

export type Contractor = {
  id: string;
  name: string;
  initials: string;
  code: string;
  scope: string;
  workers: number;
  insurance: string;
  cards: string;
  status: string;
  safety_score: number | null;
};

export type Permit = {
  id: string;
  permit_no: string;
  type: string;
  contractor_id: string;
  area: string;
  risk: string;
  status: string;
  detail: string | null;
  start_at: string | null;
  end_at: string | null;
  workers: number | null;
  created_at: string;
  permit_next_step: Role | null;
  contractors: { name: string } | null;
};

export type PermitApproval = {
  id: string;
  permit_id: string;
  step: Role;
  decision: 'approved' | 'rejected';
  note: string | null;
  decided_at: string;
  profiles: { full_name: string } | null;
};

export type PermitEvent = {
  id: string;
  permit_id: string;
  action: string;
  from_status: string;
  to_status: string;
  note: string | null;
  acted_at: string;
  profiles: { full_name: string } | null;
};

export type Badge = {
  id: string;
  name: string;
  company: string;
  training: string;
  status: string;
  id_no: string | null;
  kind: string | null;
  tier: string | null;
  card_no: string | null;
  expiry: string | null;
  role: string | null;
  perms: string[];
  training_status: string;
  created_at: string;
  /** Present once SUPABASE_PHASE12_BADGE_PHOTO_QR.sql has run. */
  photo_path?: string | null;
  verify_token?: string;
};

export const BADGE_KINDS = ['ผู้ปฏิบัติงานประจำ', 'ผู้ปฏิบัติงานชั่วคราว', 'ผู้ควบคุมงาน'];
export const BADGE_TIERS = ['ระดับ 1', 'ระดับ 2', 'ผู้ควบคุมงาน'];

export type Course = {
  code: string;
  name: string;
  detail: string;
  video_url: string | null;
  pass_score: number;
  question_count: number;
  required: boolean;
  active: boolean;
};

export type CourseQuestion = { id: string; course_code: string; question: string; options: string[]; correct_index: number; sort: number };

export type ExamResult = {
  id: string;
  name: string;
  company: string;
  course_code: string;
  taken_on: string;
  score: number;
  result: string;
  badge_id: string | null;
  courses: { name: string } | null;
};

export type Alert = { id: string; title: string; detail: string; severity: string; created_at: string; closed_at?: string | null };

export type Finding = { id: string; category: string; contractor_id: string; found_on: string; resolved: boolean };

export type Severity = 'สูง' | 'ปานกลาง' | 'ต่ำ';

export type FindingDetail = Finding & {
  permit_id: string | null;
  area: string | null;
  detail: string | null;
  severity: Severity;
  due_on: string | null;
  resolved_at: string | null;
  resolution_note: string | null;
  created_at: string;
  contractors: { name: string } | null;
  permits: { permit_no: string } | null;
  reporter: { full_name: string } | null;
  resolver: { full_name: string } | null;
};

export type MonthlyReport = { month: string; safe_hours: number; near_misses: number; on_time_close_pct: number };

export type Recommendation = { id: string; title: string; detail: string; priority: string; sort: number };

type Labels = Record<string, [label: string, tone: Tone]>;
const lookup = (labels: Labels) => (key: string): [string, Tone] => labels[key] ?? [key, 'flat'];

export const contractorStatus = lookup({ ok: ['ใช้งานได้', 'ok'], warn: ['เฝ้าระวัง', 'warn'], bad: ['ระงับ', 'bad'] });

export const permitStatus = lookup({
  active: ['กำลังทำงาน', 'ok'],
  pending: ['รออนุมัติ', 'warn'],
  approved: ['อนุมัติแล้ว', 'info'],
  rejected: ['ไม่อนุมัติ', 'bad'],
  suspended: ['ระงับงาน', 'bad'],
  closed: ['ปิดงานแล้ว', 'flat'],
});

export const badgeStatus = lookup({
  ready: ['พร้อมออกบัตร', 'ok'],
  issued: ['ออกบัตรแล้ว', 'info'],
  pending_training: ['รออบรมเพิ่ม', 'warn'],
  pending_docs: ['รอเอกสาร', 'warn'],
  rejected: ['ตีกลับ', 'bad'],
});

export const examResult = lookup({ pass: ['ผ่าน', 'ok'], fail: ['ไม่ผ่าน', 'bad'], retest: ['สอบซ้ำ', 'warn'] });

export const priorityLabel = lookup({ high: ['สูง', 'bad'], medium: ['กลาง', 'warn'], low: ['ต่ำ', 'ok'] });

const TONES: string[] = ['ok', 'warn', 'bad', 'info', 'flat'];
export const asTone = (s: string): Tone => (TONES.includes(s) ? (s as Tone) : 'flat');

const RISK_TONE: Record<string, Tone> = { 'สูง': 'bad', 'ปานกลาง': 'warn', 'ต่ำ': 'ok' };
export const riskTone = (r: string): Tone => RISK_TONE[r] ?? 'flat';
