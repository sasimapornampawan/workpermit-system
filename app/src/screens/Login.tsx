import { useState, type FormEvent, type ReactNode } from 'react';
import { BRAND } from '../brand';
import { BrandMark } from '../components/BrandMark';
import { Button, Field, FormMessage, TextInput } from '../components/form';
import { signOut, toLoginEmail } from '../hooks/useAuth';
import { MIN_PASSWORD, supabase } from '../lib/supabase';
import { C, L, MONO, SANS } from '../theme';

export function Shell({ children }: { children: ReactNode }) {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px 16px', boxSizing: 'border-box', fontFamily: SANS, color: C.ink, fontSize: 14, lineHeight: 1.5 }}>
      <div style={{ width: '100%', maxWidth: 380, background: '#fff', border: `1px solid ${L.cardBd}`, borderRadius: 12, overflow: 'hidden' }}>
        <div style={{ background: L.navy, padding: '18px 22px', display: 'flex', alignItems: 'center', gap: 12, color: '#fff' }}>
          <BrandMark height={34} />
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 14, fontWeight: 600, lineHeight: 1.35 }}>{BRAND.nameTh}</div>
            <div style={{ fontSize: 10.5, color: 'oklch(0.72 0.03 265)', fontFamily: MONO, letterSpacing: '0.04em' }}>{BRAND.nameEn}</div>
            <div style={{ fontSize: 11.5, color: 'oklch(0.8 0.03 265)', marginTop: 2 }}>{BRAND.site} · ระบบใบอนุญาตทำงาน (Work Permit)</div>
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

/** forced = the account still has a temporary password set by a safety officer. */
export function ChangePassword({ forced, onDone, onCancel }: { forced: boolean; onDone: () => void; onCancel: () => void }) {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!supabase) return;
    if (password.length < MIN_PASSWORD) {
      setError(`รหัสผ่านต้องมีอย่างน้อย ${MIN_PASSWORD} ตัวอักษร`);
      return;
    }
    if (password !== confirm) {
      setError('รหัสผ่านทั้งสองช่องไม่ตรงกัน');
      return;
    }
    setBusy(true);
    setError(null);
    const { error: err } = await supabase.auth.updateUser({ password });
    if (err) {
      setBusy(false);
      setError(err.message.toLowerCase().includes('different') ? 'รหัสผ่านใหม่ต้องไม่ซ้ำกับรหัสผ่านเดิม' : `เปลี่ยนรหัสผ่านไม่สำเร็จ: ${err.message}`);
      return;
    }
    const { error: flagErr } = await supabase.rpc('password_changed');
    setBusy(false);
    if (flagErr && forced) {
      setError(`เปลี่ยนรหัสผ่านแล้ว แต่บันทึกสถานะไม่สำเร็จ: ${flagErr.message}`);
      return;
    }
    onDone();
  }

  return (
    <Shell>
      <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div>
          <div style={{ fontSize: 16, fontWeight: 600 }}>{forced ? 'ตั้งรหัสผ่านใหม่ก่อนเริ่มใช้งาน' : 'เปลี่ยนรหัสผ่าน'}</div>
          <div style={{ fontSize: 12, color: C.mut }}>
            {forced ? 'รหัสผ่านที่ได้รับจากเจ้าหน้าที่ความปลอดภัยเป็นรหัสชั่วคราว' : 'รหัสผ่านใหม่จะใช้ได้ทันที'}
          </div>
        </div>
        <Field label="รหัสผ่านใหม่">
          <TextInput type="password" required autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder={`อย่างน้อย ${MIN_PASSWORD} ตัวอักษร`} />
        </Field>
        <Field label="ยืนยันรหัสผ่านใหม่">
          <TextInput type="password" required autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} />
        </Field>
        {error && <FormMessage error>{error}</FormMessage>}
        <Button type="submit" disabled={busy} style={{ padding: 10 }}>{busy ? 'กำลังบันทึก...' : 'บันทึกรหัสผ่านใหม่'}</Button>
        <Button variant="outline" onClick={forced ? () => signOut() : onCancel}>{forced ? 'ออกจากระบบ' : 'ยกเลิก'}</Button>
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
