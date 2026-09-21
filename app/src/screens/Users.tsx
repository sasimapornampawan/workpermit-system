import { useState, type FormEvent } from 'react';
import { Button, Field, FormMessage, Select, TextInput } from '../components/form';
import { Card, CardTitle, DataState, Pill, TableHead, TableRow, ellipsis } from '../components/ui';
import { USERNAME_DOMAIN, displayLogin, toLoginEmail, useProfile } from '../hooks/useAuth';
import { notifyDataChanged, useAdminUsers, useContractors } from '../hooks/useData';
import { MIN_PASSWORD, ROLE_LABEL, callAdminFunction, supabase, type AdminUser, type Contractor, type Role } from '../lib/supabase';
import { C, L, MONO, type Tone } from '../theme';

const COLS = 'minmax(0, 1.1fr) minmax(0, 1fr) minmax(0, 1fr) minmax(0, 1fr) 128px 118px';
const ROLES = Object.keys(ROLE_LABEL) as Role[];

/** Returns a note for the success message: whether the user will be asked to replace the temporary password. */
async function requirePasswordChange(userId: string) {
  if (!supabase) return '';
  const { error } = await supabase.rpc('admin_require_password_change', { p_user_id: userId });
  return error
    ? ` — แต่ตั้งให้ต้องเปลี่ยนรหัสผ่านไม่สำเร็จ: ${error.message}`
    : ' ผู้ใช้จะต้องเปลี่ยนรหัสผ่านเองเมื่อเข้าใช้ครั้งถัดไป';
}

type Message = { error: boolean; text: string };

function userStatus(u: AdminUser): [string, Tone] {
  if (!u.role) return ['ยังไม่กำหนดบทบาท', 'warn'];
  if (!u.active) return ['ปิดสิทธิ์', 'bad'];
  return ['ใช้งานได้', 'ok'];
}

/** Readable temporary password without look-alike characters. */
function generatePassword() {
  const chars = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const bytes = crypto.getRandomValues(new Uint32Array(10));
  return Array.from(bytes, (b) => chars[b % chars.length]).join('');
}

export function Users() {
  const profile = useProfile();
  const users = useAdminUsers();
  const contractors = useContractors();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [message, setMessage] = useState<Message | null>(null);
  const selected = users.data.find((u) => u.id === selectedId);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {creating && (
        <CreateUserForm
          contractors={contractors.data}
          onClose={() => setCreating(false)}
          onCreated={(text) => {
            setCreating(false);
            setMessage({ error: false, text });
          }}
        />
      )}
      {selected && (
        <UserEditor key={selected.id} user={selected} isSelf={selected.id === profile.id} contractors={contractors.data} onClose={() => setSelectedId(null)} />
      )}
      {message && <FormMessage error={message.error}>{message.text}</FormMessage>}

      <Card style={{ overflowX: 'auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '13px 18px', borderBottom: `1px solid ${L.headBd}` }}>
          <CardTitle title={`บัญชีผู้ใช้ (${users.data.length})`} sub="คลิกรายการเพื่อกำหนดบทบาท ปิดสิทธิ์ หรือตั้งรหัสผ่านใหม่" style={{ flex: 1 }} />
          <Button
            disabled={creating}
            onClick={() => {
              setCreating(true);
              setSelectedId(null);
              setMessage(null);
            }}
            style={{ padding: '6px 12px', fontSize: 12 }}
          >
            + สร้างบัญชี
          </Button>
        </div>
        <TableHead columns={COLS} minWidth={900} labels={['ชื่อผู้ใช้ / อีเมล', 'ชื่อที่แสดง', 'บทบาท', 'บริษัท', 'เข้าใช้ล่าสุด', 'สถานะ']} />
        <DataState loading={users.loading} error={users.error} count={users.data.length} />
        {users.data.map((u) => {
          const [statusLabel, statusTone] = userStatus(u);
          const on = u.id === selectedId;
          return (
            <TableRow
              key={u.id}
              columns={COLS}
              minWidth={900}
              onClick={() => {
                setSelectedId(on ? null : u.id);
                setCreating(false);
                setMessage(null);
              }}
              style={{ cursor: 'pointer', background: on ? 'oklch(0.97 0.018 265)' : undefined, borderLeft: `3px solid ${on ? C.acc : 'transparent'}` }}
            >
              <div style={{ fontFamily: MONO, fontSize: 12, ...ellipsis }}>{displayLogin(u.email)}</div>
              <div style={{ fontSize: 12.5, ...ellipsis }}>{u.full_name ?? '—'}{u.id === profile.id ? ' (คุณ)' : ''}</div>
              <div style={{ fontSize: 12, color: 'oklch(0.45 0.02 265)', ...ellipsis }}>{u.role ? ROLE_LABEL[u.role] : '—'}</div>
              <div style={{ fontSize: 12, color: 'oklch(0.45 0.02 265)', ...ellipsis }}>{u.contractor_name ?? '—'}</div>
              <div style={{ fontFamily: MONO, fontSize: 11, color: 'oklch(0.5 0.02 265)' }}>
                {u.last_sign_in_at ? new Date(u.last_sign_in_at).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: '2-digit' }) : 'ยังไม่เคยเข้า'}
              </div>
              <div><Pill t={statusTone}>{statusLabel}</Pill></div>
            </TableRow>
          );
        })}
      </Card>
    </div>
  );
}

function RoleFields({ role, onRole, contractorId, onContractor, contractors, allowNone, disabled }: {
  role: string; onRole: (r: string) => void; contractorId: string; onContractor: (id: string) => void;
  contractors: Contractor[]; allowNone: boolean; disabled?: boolean;
}) {
  const companies = [...contractors].sort((a, b) => a.name.localeCompare(b.name, 'th'));
  return (
    <>
      <Field label="บทบาท">
        <Select value={role} disabled={disabled} onChange={(e) => onRole(e.target.value)}>
          {allowNone && <option value="">— ไม่มีสิทธิ์ (ปิดการใช้งาน) —</option>}
          {ROLES.map((r) => <option key={r} value={r}>{ROLE_LABEL[r]}</option>)}
        </Select>
      </Field>
      {role === 'contractor' && (
        <Field label="บริษัทผู้รับเหมา">
          <Select required value={contractorId} onChange={(e) => onContractor(e.target.value)}>
            <option value="">— เลือกบริษัท —</option>
            {companies.map((c) => <option key={c.id} value={c.id}>{c.name} ({c.code})</option>)}
          </Select>
        </Field>
      )}
    </>
  );
}

function PasswordField({ value, onChange, label }: { value: string; onChange: (v: string) => void; label: string }) {
  return (
    <Field label={label}>
      <div style={{ display: 'flex', gap: 6 }}>
        <TextInput value={value} onChange={(e) => onChange(e.target.value)} autoComplete="new-password" spellCheck={false} placeholder={`อย่างน้อย ${MIN_PASSWORD} ตัวอักษร`} style={{ fontFamily: MONO }} />
        <Button variant="outline" onClick={() => onChange(generatePassword())} style={{ padding: '7px 10px', fontSize: 11.5 }}>สุ่ม</Button>
      </div>
    </Field>
  );
}

function CreateUserForm({ contractors, onClose, onCreated }: { contractors: Contractor[]; onClose: () => void; onCreated: (message: string) => void }) {
  const [login, setLogin] = useState('');
  const [password, setPassword] = useState(generatePassword);
  const [name, setName] = useState('');
  const [role, setRole] = useState<string>('contractor');
  const [contractorId, setContractorId] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!/^[a-z0-9._@+-]+$/i.test(login.trim())) {
      setError('ชื่อผู้ใช้ใช้ได้เฉพาะตัวอักษรภาษาอังกฤษ ตัวเลข และ . _ - (หรือใส่อีเมลเต็ม)');
      return;
    }
    if (password.length < MIN_PASSWORD) {
      setError(`รหัสผ่านต้องมีอย่างน้อย ${MIN_PASSWORD} ตัวอักษร`);
      return;
    }
    setSaving(true);
    setError(null);
    const { data, error: failure } = await callAdminFunction({
      action: 'create',
      email: toLoginEmail(login),
      password,
      full_name: name.trim(),
      role,
      contractor_id: role === 'contractor' ? contractorId : null,
    });
    if (failure) {
      setSaving(false);
      setError(failure);
      return;
    }
    const note = await requirePasswordChange(String(data?.id));
    setSaving(false);
    notifyDataChanged();
    onCreated(`สร้างบัญชีแล้ว — ชื่อผู้ใช้ ${displayLogin(toLoginEmail(login))} รหัสผ่านชั่วคราว ${password} (แจ้งผู้ใช้ด้วยตนเอง)${note}`);
  }

  return (
    <Card style={{ padding: 18 }}>
      <form onSubmit={submit}>
        <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 3 }}>สร้างบัญชีผู้ใช้</div>
        <div style={{ fontSize: 11.5, color: 'oklch(0.56 0.02 265)', marginBottom: 14 }}>
          ใส่ชื่อผู้ใช้ภาษาอังกฤษ เช่น somchai (ระบบใช้ somchai@{USERNAME_DOMAIN}) หรือใส่อีเมลจริงก็ได้
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14 }}>
          <Field label="ชื่อผู้ใช้ หรืออีเมล">
            <TextInput required value={login} onChange={(e) => setLogin(e.target.value)} autoCapitalize="none" spellCheck={false} placeholder="somchai" />
          </Field>
          <PasswordField label="รหัสผ่านเริ่มต้น" value={password} onChange={setPassword} />
          <Field label="ชื่อที่แสดง"><TextInput required value={name} onChange={(e) => setName(e.target.value)} placeholder="นายสมชาย ใจดี" /></Field>
          <RoleFields role={role} onRole={setRole} contractorId={contractorId} onContractor={setContractorId} contractors={contractors} allowNone={false} />
        </div>
        {error && <FormMessage error style={{ marginTop: 12 }}>{error}</FormMessage>}
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 16 }}>
          <Button variant="outline" onClick={onClose}>ยกเลิก</Button>
          <Button type="submit" disabled={saving}>{saving ? 'กำลังสร้างบัญชี...' : 'สร้างบัญชี'}</Button>
        </div>
      </form>
    </Card>
  );
}

function UserEditor({ user, isSelf, contractors, onClose }: { user: AdminUser; isSelf: boolean; contractors: Contractor[]; onClose: () => void }) {
  const [name, setName] = useState(user.full_name ?? '');
  const [role, setRole] = useState<string>(user.role && user.active ? user.role : '');
  const [contractorId, setContractorId] = useState(user.contractor_id ?? '');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState<'save' | 'password' | null>(null);
  const [message, setMessage] = useState<Message | null>(null);

  async function save(e: FormEvent) {
    e.preventDefault();
    if (!supabase) return;
    if (!role && !window.confirm(`ปิดสิทธิ์ของ ${user.full_name ?? displayLogin(user.email)}?\nผู้ใช้จะเข้าระบบได้แต่ไม่เห็นข้อมูลใด ๆ ประวัติการทำงานเดิมยังเก็บไว้`)) return;
    setBusy('save');
    setMessage(null);
    const { error } = await supabase.rpc('admin_set_profile', {
      p_user_id: user.id,
      p_full_name: name.trim(),
      p_role: role || null,
      p_contractor_id: role === 'contractor' ? contractorId || null : null,
    });
    setBusy(null);
    if (error) {
      setMessage({ error: true, text: `บันทึกไม่สำเร็จ: ${error.message}` });
      return;
    }
    setMessage({ error: false, text: role ? 'บันทึกบทบาทแล้ว ผู้ใช้ต้องรีเฟรชหน้าเว็บจึงจะเห็นสิทธิ์ใหม่' : 'ปิดสิทธิ์แล้ว' });
    notifyDataChanged();
  }

  async function resetPassword() {
    if (password.length < MIN_PASSWORD) {
      setMessage({ error: true, text: `รหัสผ่านต้องมีอย่างน้อย ${MIN_PASSWORD} ตัวอักษร` });
      return;
    }
    setBusy('password');
    setMessage(null);
    const { error: failure } = await callAdminFunction({ action: 'reset_password', user_id: user.id, password });
    if (failure) {
      setBusy(null);
      setMessage({ error: true, text: failure });
      return;
    }
    const note = await requirePasswordChange(user.id);
    setBusy(null);
    setMessage({ error: false, text: `ตั้งรหัสผ่านชั่วคราวแล้ว: ${password} (แจ้งผู้ใช้ด้วยตนเอง)${note}` });
    setPassword('');
  }

  return (
    <Card style={{ padding: 18 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 14, fontWeight: 600 }}>{user.full_name ?? 'บัญชีที่ยังไม่กำหนดบทบาท'}</div>
          <div style={{ fontFamily: MONO, fontSize: 11.5, color: 'oklch(0.5 0.02 265)' }}>{displayLogin(user.email)}</div>
        </div>
        <Button variant="outline" onClick={onClose} style={{ padding: '5px 11px', fontSize: 12 }}>ปิดหน้าต่าง</Button>
      </div>

      <form onSubmit={save}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14 }}>
          <Field label="ชื่อที่แสดง"><TextInput required={!!role} value={name} onChange={(e) => setName(e.target.value)} /></Field>
          <RoleFields role={role} onRole={setRole} contractorId={contractorId} onContractor={setContractorId} contractors={contractors} allowNone={!isSelf} disabled={isSelf} />
        </div>
        {isSelf && <div style={{ fontSize: 11.5, color: 'oklch(0.55 0.02 265)', marginTop: 8 }}>เปลี่ยนบทบาทของตัวเองไม่ได้ เพื่อไม่ให้ระบบไม่มี จป. ดูแล</div>}
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 14 }}>
          <Button type="submit" disabled={busy !== null}>{busy === 'save' ? 'กำลังบันทึก...' : 'บันทึกบทบาท'}</Button>
        </div>
      </form>

      <div style={{ marginTop: 16, paddingTop: 14, borderTop: `1px solid ${L.headBd}`, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 14, alignItems: 'end' }}>
        <PasswordField label="ตั้งรหัสผ่านใหม่" value={password} onChange={setPassword} />
        <div>
          <Button variant="outline" disabled={busy !== null || !password} onClick={resetPassword}>
            {busy === 'password' ? 'กำลังบันทึก...' : 'ตั้งรหัสผ่านใหม่'}
          </Button>
        </div>
      </div>

      {message && <FormMessage error={message.error} style={{ marginTop: 12 }}>{message.text}</FormMessage>}
    </Card>
  );
}
