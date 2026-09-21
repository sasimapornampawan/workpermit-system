import type { SupabaseClient } from '@supabase/supabase-js';
import { useEffect, useState } from 'react';
import type { PermitAttachment } from '../lib/attachments';
import {
  supabase, type AdminUser, type Alert, type Badge, type Contractor, type Course, type CourseQuestion, type ExamResult,
  type Finding, type FindingDetail, type MonthlyReport, type Permit, type PermitApproval, type PermitEvent, type Recommendation,
} from '../lib/supabase';

const listeners = new Set<() => void>();

/** Refetch every mounted data hook, e.g. after a write so the sidebar counts update too. */
export const notifyDataChanged = () => listeners.forEach((listener) => listener());

type Run = (client: SupabaseClient) => PromiseLike<{ data: unknown; error: { message: string } | null }>;

/** `key` identifies the query; `run` is read only when the key changes or data is invalidated. */
function useFetch<T>(key: string, run: Run) {
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
    run(supabase).then(({ data: rows, error: err }) => {
      if (err) {
        setError(err.message);
      } else {
        setData((rows ?? []) as T[]);
        setError(null);
      }
      setLoading(false);
    });
    // `run` is recreated every render; `key` captures what it queries.
  }, [key, version]);

  return { data, loading, error };
}

const useTable = <T,>(table: string, select = '*') =>
  useFetch<T>(`${table}?${select}`, (client) => client.from(table).select(select));

export const useContractors = () => useTable<Contractor>('contractors');
export const usePermits = () => useTable<Permit>('permits', '*, contractors(name), permit_next_step');
export const usePermitApprovals = () => useTable<PermitApproval>('permit_approvals', '*, profiles(full_name)');
export const usePermitEvents = () => useTable<PermitEvent>('permit_events', '*, profiles(full_name)');
export const usePermitAttachments = () => useTable<PermitAttachment>('permit_attachments', '*, profiles(full_name)');
export const useBadges = () => useTable<Badge>('badges');
export const useCourses = () => useTable<Course>('courses');
/** Safety officers only; other roles get no rows because answers are stored here. */
export const useCourseQuestions = () => useTable<CourseQuestion>('course_questions');
export const useExamResults = () => useTable<ExamResult>('exam_results', '*, courses(name)');
export const useAlerts = () => useTable<Alert>('alerts');
export const useFindings = () => useTable<Finding>('findings');
/** Needs SUPABASE_PHASE10_FINDINGS.sql; the plain hook above keeps the dashboard working without it. */
export const useFindingDetails = () =>
  useTable<FindingDetail>(
    'findings',
    '*, contractors(name), permits(permit_no), reporter:profiles!findings_reported_by_fkey(full_name), resolver:profiles!findings_resolved_by_fkey(full_name)',
  );
export const useMonthlyReports = () => useTable<MonthlyReport>('monthly_reports');
export const useRecommendations = () => useTable<Recommendation>('recommendations');
/** Safety officers only; returns no rows for other roles. */
export const useAdminUsers = () => useFetch<AdminUser>('rpc:admin_list_users', (client) => client.rpc('admin_list_users'));
