import { useEffect, useState } from 'react';
import {
  supabase, type Alert, type Badge, type Contractor, type Course, type ExamResult,
  type Finding, type MonthlyReport, type Permit, type PermitApproval, type PermitEvent, type Recommendation,
} from '../lib/supabase';

const listeners = new Set<() => void>();

/** Refetch every mounted table hook, e.g. after a write so the sidebar counts update too. */
export const notifyDataChanged = () => listeners.forEach((listener) => listener());

function useTable<T>(table: string, select = '*') {
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [version, setVersion] = useState(0);

  useEffect(() => {
    const listener = () => setVersion((v) => v + 1);
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  }, []);

  useEffect(() => {
    if (!supabase) {
      setError('ยังไม่ได้ตั้งค่า VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY');
      setLoading(false);
      return;
    }
    supabase.from(table).select(select).then(({ data: rows, error: err }) => {
      if (err) {
        setError(err.message);
      } else {
        setData((rows ?? []) as unknown as T[]);
        setError(null);
      }
      setLoading(false);
    });
  }, [table, select, version]);

  return { data, loading, error };
}

export const useContractors = () => useTable<Contractor>('contractors');
export const usePermits = () => useTable<Permit>('permits', '*, contractors(name), permit_next_step');
export const usePermitApprovals = () => useTable<PermitApproval>('permit_approvals', '*, profiles(full_name)');
export const usePermitEvents = () => useTable<PermitEvent>('permit_events', '*, profiles(full_name)');
export const useBadges = () => useTable<Badge>('badges');
export const useCourses = () => useTable<Course>('courses');
export const useExamResults = () => useTable<ExamResult>('exam_results', '*, courses(name)');
export const useAlerts = () => useTable<Alert>('alerts');
export const useFindings = () => useTable<Finding>('findings');
export const useMonthlyReports = () => useTable<MonthlyReport>('monthly_reports');
export const useRecommendations = () => useTable<Recommendation>('recommendations');
