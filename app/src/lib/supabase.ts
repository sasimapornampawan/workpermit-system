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
};

const CONTRACTOR_STATUS: Record<string, [string, Tone]> = {
  ok: ['ใช้งานได้', 'ok'],
  warn: ['เฝ้าระวัง', 'warn'],
  bad: ['ระงับ', 'bad'],
};

const PERMIT_STATUS: Record<string, [string, Tone]> = {
  active: ['กำลังทำงาน', 'ok'],
  pending: ['รออนุมัติ', 'warn'],
  approved: ['อนุมัติแล้ว', 'info'],
  suspended: ['ระงับงาน', 'bad'],
  closed: ['ปิดงานแล้ว', 'flat'],
};

const RISK_TONE: Record<string, Tone> = { 'สูง': 'bad', 'ปานกลาง': 'warn', 'ต่ำ': 'ok' };

export const contractorStatus = (s: string): [string, Tone] => CONTRACTOR_STATUS[s] ?? [s, 'flat'];
export const permitStatus = (s: string): [string, Tone] => PERMIT_STATUS[s] ?? [s, 'flat'];
export const riskTone = (r: string): Tone => RISK_TONE[r] ?? 'flat';
