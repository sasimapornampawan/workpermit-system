import { useEffect, useState } from 'react';
import { supabase, type Badge, type Contractor, type Permit } from '../lib/supabase';

function useTable<T>(table: string, select: string) {
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

export const useContractors = () => useTable<Contractor>('contractors', '*');
export const usePermits = () => useTable<Permit>('permits', '*, contractors(name)');
export const useBadges = () => useTable<Badge>('badges', '*');

export function dataStateMessage(loading: boolean, error: string | null, count: number) {
  if (loading) return 'กำลังโหลดข้อมูล...';
  if (error) return `โหลดข้อมูลไม่สำเร็จ: ${error}`;
  if (count === 0) return 'ยังไม่มีข้อมูล';
  return null;
}
