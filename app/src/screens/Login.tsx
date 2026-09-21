import { useState, type FormEvent, type ReactNode } from 'react';
import { Button, Field, FormMessage, TextInput } from '../components/form';
import { signOut, toLoginEmail } from '../hooks/useAuth';
import { supabase } from '../lib/supabase';
import { C, L, MONO, SANS } from '../theme';

function Shell({ children }: { children: ReactNode }) {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px 16px', boxSizing: 'border-box', fontFamily: SANS, color: C.ink, fontSize: 14, lineHeight: 1.5 }}>
      <div style={{ width: '100%', maxWidth: 380, background: '#fff', border: `1px solid ${L.cardBd}`, borderRadius: 12, overflow: 'hidden' }}>
        <div style={{ background: L.navy, padding: '18px 22px', display: 'flex', alignItems: 'center', gap: 10, color: '#fff' }}>
          <div style={{ width: 28, height: 28, borderRadius: 6, background: 'oklch(0.62 0.17 265)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: MONO, fontSize: 14, fontWeight: 600, color: 'oklch(0.15 0.04 265)' }}>P</div>
          <div>
            <div style={{ fontSize: 14, fontWeight: 600 }}>Safety Permit</div>
            <div style={{ fontSize: 10.5, color: 'oklch(0.72 0.03 265)', fontFamily: MONO, letterSpacing: '0.04em' }}>PTW SYSTEM v2</div>
          </div>
        </div>
        <div style={{ padding: 22 }}>{children}</div>
      </div>
    </div>
  );
}

export function Login() {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!supabase) {
      setError('ยังไม่ได้ตั้งค่า VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY');
      return;
    }
    setBusy(true);
    setError(null);
    const { error: err } = await supabase.auth.signInWithPassword({ email: toLoginEmail(identifier), password });
    setBusy(false);
    if (err) setError(err.message === 'Invalid login credentials' ? 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง' : err.message);
  }

  return (
    <Shell>
      <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div>
          <div style={{ fontSize: 16, fontWeight: 600 }}>เข้าสู่ระบบ</div>
          <div style={{ fontSize: 12, color: C.mut }}>ใช้บัญชีที่ได้รับจากเจ้าหน้าที่ความปลอดภัย</div>
        </div>
        <Field label="ชื่อผู้ใช้ หรืออีเมล">
          <TextInput
            required
            autoComplete="username"
            autoCapitalize="none"
            spellCheck={false}
            value={identifier}
            onChange={(e) => setIdentifier(e.target.value)}
          />
        </Field>
        <Field label="รหัสผ่าน">
          <TextInput type="password" required autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} />
        </Field>
        {error && <FormMessage error>{error}</FormMessage>}
        <Button type="submit" disabled={busy} style={{ padding: 10 }}>{busy ? 'กำลังเข้าสู่ระบบ...' : 'เข้าสู่ระบบ'}</Button>
      </form>
    </Shell>
  );
}

export function AuthMessage({ children, showSignOut }: { children: ReactNode; showSignOut?: boolean }) {
  return (
    <Shell>
      <div style={{ fontSize: 13, color: C.mut, marginBottom: showSignOut ? 14 : 0 }}>{children}</div>
      {showSignOut && <Button variant="outline" onClick={() => signOut()}>ออกจากระบบ</Button>}
    </Shell>
  );
}
