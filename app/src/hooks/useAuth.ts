import type { Session } from '@supabase/supabase-js';
import { createContext, useContext, useEffect, useState } from 'react';
import { supabase, type Profile } from '../lib/supabase';

/** undefined = not known yet, null = known to be absent */
export function useAuth() {
  const [session, setSession] = useState<Session | null | undefined>(undefined);
  const [profile, setProfile] = useState<Profile | null | undefined>(undefined);

  useEffect(() => {
    if (!supabase) {
      setSession(null);
      return;
    }
    const { data } = supabase.auth.onAuthStateChange((_event, next) => setSession(next));
    return () => data.subscription.unsubscribe();
  }, []);

  const userId = session?.user.id;

  // Fetched in its own effect: querying inside onAuthStateChange can deadlock the auth client.
  useEffect(() => {
    if (!supabase || !userId) {
      setProfile(null);
      return;
    }
    setProfile(undefined);
    supabase
      .from('profiles')
      .select('id, full_name, role, contractor_id')
      .eq('id', userId)
      .maybeSingle()
      .then(({ data }) => setProfile((data as Profile | null) ?? null));
  }, [userId]);

  return { session, profile, loading: session === undefined || (!!userId && profile === undefined) };
}

export const signOut = () => supabase?.auth.signOut();

export const ProfileContext = createContext<Profile | null>(null);

export function useProfile() {
  const profile = useContext(ProfileContext);
  if (!profile) throw new Error('useProfile must be used inside ProfileContext');
  return profile;
}
