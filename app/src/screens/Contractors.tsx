import { useState, type ChangeEvent, type FormEvent } from 'react';
import { Button, Field, FormMessage, Select, TextInput } from '../components/form';
import { Card, DataState, OutlineButton, Pill, TableHead, TableRow, ellipsis } from '../components/ui';
import { useProfile } from '../hooks/useAuth';
import { notifyDataChanged, useContractors } from '../hooks/useData';
import { contractorStatus, supabase } from '../lib/supabase';
import { L, MONO } from '../theme';

const COLS = 'minmax(0, 1.5fr) 130px 84px 118px 118px 110px';

export function Contractors() {
  const profile = useProfile();
  const { data, loading, error } = useContractors();
  const [adding, setAdding] = useState(false);
  const isSafety = profile.role === 'safety';
  const contractors = [...data].sort((a, b) => a.code.localeCompare(b.code));
  const kpis = [
    { label: 'ผู้รับเหมาที่ขึ้นทะเบียน', value: data.length },
    { label: 'พนักงานผู้รับเหมาทั้งหมด', value: data.reduce((n, c) => n + c.workers, 0) },
    { label: 'อยู่ระหว่างเฝ้าระวัง', value: data.filter((c) => c.status === 'warn').length },
    { label: 'ระงับการทำงาน', value: data.filter((c) => c.status === 'bad').length },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 12 }}>
        {kpis.map((k) => (
          <Card key={k.label} style={{ padding: '13px 15px' }}>
            <div style={{ fontSize: 11.5, color: 'oklch(0.5 0.02 265)', marginBottom: 6 }}>{k.label}</div>
            <div style={{ fontFamily: MONO, fontSize: 24, fontWeight: 500, lineHeight: 1 }}>{loading ? '—' : k.value.toLocaleString('en-US')}</div>
          </Card>
        ))}
      </div>

      {adding && <AddContractorForm onClose={() => setAdding(false)} />}

      <Card style={{ overflowX: 'auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '13px 18px', borderBottom: `1px solid ${L.headBd}` }}>
          <div style={{ fontSize: 14, fontWeight: 600, flex: 1 }}>ทะเบียนผู้รับเหมา</div>
          {isSafety && (
            <>
              <OutlineButton style={{ padding: '6px 12px', borderRadius: 7, fontSize: 12 }}>นำเข้าไฟล์ Excel</OutlineButton>
              <Button disabled={adding} onClick={() => setAdding(true)} style={{ padding: '6px 12px', fontSize: 12 }}>+ เพิ่มผู้รับเหมา</Button>
            </>
          )}
        </div>
        <TableHead columns={COLS} minWidth={850} labels={['บริษัทผู้รับเหมา', 'ประเภทงาน', 'พนักงาน', 'ประกันภัย', 'บัตรที่ใช้งาน', 'สถานะ']} />
        <DataState loading={loading} error={error} count={data.length} />
        {contractors.map((c) => {
          const [statusLabel, statusTone] = contractorStatus(c.status);
          return (
            <TableRow key={c.id} columns={COLS} minWidth={850}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                <div style={{ width: 28, height: 28, flex: '0 0 28px', borderRadius: 6, background: 'oklch(0.95 0.03 265)', color: 'oklch(0.42 0.12 265)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10.5, fontWeight: 600 }}>{c.initials}</div>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 12.5, fontWeight: 500, ...ellipsis }}>{c.name}</div>
                  <div style={{ fontFamily: MONO, fontSize: 10.5, color: 'oklch(0.58 0.02 265)' }}>{c.code}</div>
                </div>
              </div>
              <div style={{ fontSize: 12, color: 'oklch(0.45 0.02 265)' }}>{c.scope}</div>
              <div style={{ fontFamily: MONO, fontSize: 12.5 }}>{c.workers}</div>
              <div style={{ fontFamily: MONO, fontSize: 11.5, color: 'oklch(0.45 0.02 265)' }}>{c.insurance}</div>
              <div style={{ fontFamily: MONO, fontSize: 11.5, color: 'oklch(0.45 0.02 265)' }}>{c.cards}</div>
              <div><Pill t={statusTone}>{statusLabel}</Pill></div>
            </TableRow>
          );
        })}
      </Card>
    </div>
  );
}

const EMPTY_FORM = { name: '', code: '', initials: '', scope: '', workers: '', insurance: '', status: 'ok' };

function AddContractorForm({ onClose }: { onClose: () => void }) {
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const set = (key: keyof typeof EMPTY_FORM) => (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setForm({ ...form, [key]: e.target.value });

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!supabase) return;
    setSaving(true);
    setError(null);
    const workers = Number(form.workers);
    const { error: err } = await supabase.from('contractors').insert({
      name: form.name.trim(),
      code: form.code.trim().toUpperCase(),
      initials: form.initials.trim().toUpperCase(),
      scope: form.scope.trim(),
      workers,
      insurance: form.insurance.trim(),
      cards: `0 / ${workers}`,
      status: form.status,
    });
    setSaving(false);
    if (err) {
      setError(err.code === '23505' ? 'รหัสผู้รับเหมานี้มีอยู่แล้ว' : `บันทึกไม่สำเร็จ: ${err.message}`);
      return;
    }
    notifyDataChanged();
    onClose();
  }

  return (
    <Card style={{ padding: 18 }}>
      <form onSubmit={submit}>
        <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 14 }}>เพิ่มผู้รับเหมา</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14 }}>
          <Field label="ชื่อบริษัท" wide><TextInput required value={form.name} onChange={set('name')} placeholder="บจก. ..." /></Field>
          <Field label="รหัสผู้รับเหมา"><TextInput required value={form.code} onChange={set('code')} placeholder="CTR-0300" /></Field>
          <Field label="อักษรย่อ"><TextInput required maxLength={3} value={form.initials} onChange={set('initials')} placeholder="AB" /></Field>
          <Field label="ประเภทงาน"><TextInput required value={form.scope} onChange={set('scope')} placeholder="งานไฟฟ้า" /></Field>
          <Field label="จำนวนพนักงาน"><TextInput required type="number" min={0} value={form.workers} onChange={set('workers')} /></Field>
          <Field label="ประกันภัยหมดอายุ"><TextInput required value={form.insurance} onChange={set('insurance')} placeholder="31 ธ.ค. 2570" /></Field>
          <Field label="สถานะ">
            <Select value={form.status} onChange={set('status')}>
              <option value="ok">ใช้งานได้</option>
              <option value="warn">เฝ้าระวัง</option>
              <option value="bad">ระงับ</option>
            </Select>
          </Field>
        </div>
        {error && <FormMessage error style={{ marginTop: 12 }}>{error}</FormMessage>}
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 16 }}>
          <Button variant="outline" onClick={onClose}>ยกเลิก</Button>
          <Button type="submit" disabled={saving}>{saving ? 'กำลังบันทึก...' : 'บันทึก'}</Button>
        </div>
      </form>
    </Card>
  );
}
