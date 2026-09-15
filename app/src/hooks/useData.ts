import { useEffect, useState } from 'react';
import { supabase, type Contractor, type Permit, type Badge } from '../lib/supabase';

export function useContractors() {
  const [data, setData] = useState<Contractor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetch() {
      try {
        const { data: rows, error: err } = await supabase
          .from('contractors')
          .select('*');
        if (err) throw err;
        setData(rows || []);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Error');
        console.error('Error:', e);
      } finally {
        setLoading(false);
      }
    }
    fetch();
  }, []);

  return { data, loading, error };
}

export function usePermits() {
  const [data, setData] = useState<Permit[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetch() {
      try {
        const { data: rows, error: err } = await supabase
          .from('permits')
          .select('*');
        if (err) throw err;
        setData(rows || []);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Error');
        console.error('Error:', e);
      } finally {
        setLoading(false);
      }
    }
    fetch();
  }, []);

  return { data, loading, error };
}

export function useBadges() {
  const [data, setData] = useState<Badge[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetch() {
      try {
        const { data: rows, error: err } = await supabase
          .from('badges')
          .select('*');
        if (err) throw err;
        setData(rows || []);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Error');
        console.error('Error:', e);
      } finally {
        setLoading(false);
      }
    }
    fetch();
  }, []);

  return { data, loading, error };
}
