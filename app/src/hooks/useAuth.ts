import type { Session } from '@supabase/supabase-js';
import { createContext, useContext, useEffect, useState } from 'react';
import type { PermissionKey } from '../lib/permissions';
import { supabase, type Profile } from '../lib/supabase';

/** The signed-in user with the permissions the database grants them. */
export type CurrentUser = Profile & { permissions: PermissionKey[] };

// Supabase Auth needs an email, so username-only accounts are created as <username>@USERNAME_DOMAIN.
export const USERNAME_DOMAIN = 'workpermit.local';

export const toLoginEmail = (identifier: string) => {
  const value = identifier.trim().toLowerCase();
  return value.includes('@') ? value : `${value}@${USERNAME_DOMAIN}`;
};

export const displayLogin = (email: string) =>
  email.endsWith(`@${USERNAME_DOMAIN}`) ? email.slice(0, -(USERNAME_DOMAIN.length + 1)) : email;

/** undefined = not known yet, null = known to be absent */
export function useAuth() {
  const [session, setSession] = useState<Session | null | undefined>(undefined);
  const [profile, setProfile] = useState<CurrentUser | null | undefined>(undefined);
  const [profileVersion, setProfileVersion] = useState(0);

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
    // '*' rather than naming `active`, so this keeps working before that column exists.
    Promise.all([
      supabase.from('profiles').select('*').eq('id', userId).maybeSingle(),
      supabase.rpc('my_permissions'),
    ]).then(([{ data }, { data: permissions }]) => {
      const row = data as (Profile & { active?: boolean }) | null;
      setProfile(row && row.active !== false
        ? {
          id: row.id, full_name: row.full_name, role: row.role, contractor_id: row.contractor_id,
          must_change_password: row.must_change_password === true,
          permissions: (permissions as PermissionKey[] | null) ?? [],
        }
        : null);
    });
  }, [userId, profileVersion]);

  return {
    session,
    profile,
    loading: session === undefined || (!!userId && profile === undefined),
    reloadProfile: () => setProfileVersion((v) => v + 1),
  };
}

export const signOut = () => supabase?.auth.signOut();

export const ProfileContext = createContext<CurrentUser | null>(null);

export function useProfile() {
  const profile = useContext(ProfileContext);
  if (!profile) throw new Error('useProfile must be used inside ProfileContext');
  return profile;
}

/** can('manage_badges') — true when the database would allow it. */
export function useCan() {
  const profile = useProfile();
  return (permission: PermissionKey) => profile.permissions.includes(permission);
}
