import { useEffect, useState } from 'react';
import {
  supabase, type Alert, type Badge, type Contractor, type Course, type ExamResult,
  type Finding, type MonthlyReport, type Permit, type Recommendation,
} from '../lib/supabase';

function useTable<T>(table: string, select = '*') {
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!supabase) {
      setError('ยังไม่ได้ตั้งค่า VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY');
      setLoading(false);
      return;
    }
    supabase.from(table).select(select).then(({ data: rows, error: err }) => {
      if (err) setError(err.message);
      else setData((rows ?? []) as unknown as T[]);
      setLoading(false);
    });
  }, [table, select]);

  return { data, loading, error };
}

export const useContractors = () => useTable<Contractor>('contractors');
export const usePermits = () => useTable<Permit>('permits', '*, contractors(name)');
export const useBadges = () => useTable<Badge>('badges');
export const useCourses = () => useTable<Course>('courses');
export const useExamResults = () => useTable<ExamResult>('exam_results', '*, courses(name)');
export const useAlerts = () => useTable<Alert>('alerts');
export const useFindings = () => useTable<Finding>('findings');
export const useMonthlyReports = () => useTable<MonthlyReport>('monthly_reports');
export const useRecommendations = () => useTable<Recommendation>('recommendations');
