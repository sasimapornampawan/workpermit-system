import { createClient } from '@supabase/supabase-js';
import type { Tone } from '../theme';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// createClient throws on an empty URL, which would blank the whole app when env vars are missing.
export const supabase = supabaseUrl && supabaseAnonKey ? createClient(supabaseUrl, supabaseAnonKey) : null;

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
  created_at: string;
  contractors: { name: string } | null;
};

export type Badge = {
  id: string;
  name: string;
  company: string;
  training: string;
  status: string;
  id_no: string;
  kind: string;
  tier: string;
  card_no: string;
  expiry: string;
  role: string;
  perms: string[];
  training_status: string;
  created_at: string;
};

export type Course = { code: string; name: string; detail: string; pass_rate: number; taken: number };

export type ExamResult = {
  id: string;
  name: string;
  company: string;
  course_code: string;
  taken_on: string;
  score: number;
  result: string;
  courses: { name: string } | null;
};

export type Alert = { id: string; title: string; detail: string; severity: string; created_at: string };

export type Finding = { id: string; category: string; contractor_id: string; found_on: string; resolved: boolean };

export type MonthlyReport = { month: string; safe_hours: number; near_misses: number; on_time_close_pct: number };

export type Recommendation = { id: string; title: string; detail: string; priority: string; sort: number };

type Labels = Record<string, [label: string, tone: Tone]>;
const lookup = (labels: Labels) => (key: string): [string, Tone] => labels[key] ?? [key, 'flat'];

export const contractorStatus = lookup({ ok: ['ใช้งานได้', 'ok'], warn: ['เฝ้าระวัง', 'warn'], bad: ['ระงับ', 'bad'] });

export const permitStatus = lookup({
  active: ['กำลังทำงาน', 'ok'],
  pending: ['รออนุมัติ', 'warn'],
  approved: ['อนุมัติแล้ว', 'info'],
  suspended: ['ระงับงาน', 'bad'],
  closed: ['ปิดงานแล้ว', 'flat'],
});

export const badgeStatus = lookup({
  ready: ['พร้อมออกบัตร', 'ok'],
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
