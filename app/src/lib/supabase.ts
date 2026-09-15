import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export type Contractor = {
  id: string;
  name: string;
  initials: string;
  code: string;
  scope: string;
  workers: number;
  insurance: string;
  cards: string;
  status: 'ok' | 'warn' | 'bad';
};

export type Permit = {
  id: string;
  permit_no: string;
  type: string;
  contractor_id: string;
  area: string;
  risk: string;
  status: string;
};

export type Badge = {
  id: string;
  name: string;
  company: string;
  training: string;
  status: string;
};
