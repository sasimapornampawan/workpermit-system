import { useState, type FormEvent } from 'react';
import { useCan, useProfile } from '../hooks/useAuth';
import { notifyDataChanged, useAlerts } from '../hooks/useData';
import { asTone, supabase } from '../lib/supabase';
import { MONO, tone } from '../theme';
import { Button, Field, FormMessage, Select, TextInput } from './form';
import { Card, DataState } from './ui';

const SEVERITY_ORDER: Record<string, number> = { bad: 0, warn: 1, info: 2 };
const SEVERITIES: [string, string][] = [['bad', 'ด่วน'], ['warn', 'เฝ้าระวัง'], ['info', 'แจ้งให้ทราบ']];

function alertTime(iso: string, now: Date) {
  const d = new Date(iso);
  return d.toDateString() === now.toDateString()
    ? d.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })
    : d.toLocaleDateString('th-TH', { day: 'numeric', month: 'short' });
}

export function AlertsCard({ now }: { now: Date }) {
  const profile = useProfile();
  const can = useCan();
  const alerts = useAlerts();
  const [adding, setAdding] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const canManage = can('manage_alerts');

  const open = alerts.data
    .filter((a) => !a.closed_at)
    .sort((a, b) => (SEVERITY_ORDER[a.severity] ?? 3) - (SEVERITY_ORDER[b.severity] ?? 3) || b.created_at.localeCompare(a.created_at));

  async function close(id: string) {
    if (!supabase) return;
    setBusyId(id);
    setError(null);
    const { data: rows, error: err } = await supabase
      .from('alerts')
      .update({ closed_at: new Date().toISOString(), closed_by: profile.id })
      .eq('id', id)
      .select('id');
    setBusyId(null);
    if (err || !rows?.length) {
      setError(`ปิดแจ้งเตือนไม่สำเร็จ: ${err?.message ?? 'ไม่มีสิทธิ์'}`);
      return;
    }
    notifyDataChanged();
  }

  return (
    <Card style={{ padding: '16px 18px' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 14 }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 3 }}>แจ้งเตือนที่ต้องดำเนินการ</div>
          <div style={{ fontSize: 11.5, color: 'oklch(0.56 0.02 265)' }}>เรียงตามความเร่งด่วน</div>
        </div>
        {canManage && !adding && (
          <Button variant="outline" onClick={() => setAdding(true)} style={{ padding: '5px 10px', fontSize: 11.5 }}>+ เพิ่มแจ้งเตือน</Button>
        )}
      </div>

      {adding && <AlertForm onClose={() => setAdding(false)} />}

      <DataState loading={alerts.loading} error={alerts.error} count={open.length} empty="ไม่มีแจ้งเตือนที่ต้องดำเนินการ" style={{ padding: 0 }} />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
        {open.map((a) => {
          const t = tone(asTone(a.severity));
          return (
            <div key={a.id} style={{ display: 'flex', gap: 10, padding: '10px 11px', borderRadius: 8, background: t.bg, border: `1px solid ${t.bd}` }}>
              <div style={{ width: 3, borderRadius: 2, background: t.accent, flex: '0 0 3px' }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12.5, fontWeight: 500, marginBottom: 2 }}>{a.title}</div>
                {a.detail && <div style={{ fontSize: 11.5, color: 'oklch(0.48 0.02 265)' }}>{a.detail}</div>}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
                <div style={{ fontFamily: MONO, fontSize: 10.5, color: 'oklch(0.55 0.02 265)', whiteSpace: 'nowrap' }}>{alertTime(a.created_at, now)}</div>
                {canManage && (
                  <button
                    type="button"
                    disabled={busyId !== null}
                    onClick={() => close(a.id)}
                    className="h-underline"
                    style={{ border: 'none', background: 'none', padding: 0, fontSize: 11, color: t.fg, cursor: busyId ? 'default' : 'pointer', whiteSpace: 'nowrap' }}
                  >
                    {busyId === a.id ? 'กำลังปิด...' : 'ดำเนินการแล้ว'}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
      {error && <FormMessage error style={{ marginTop: 10 }}>{error}</FormMessage>}
    </Card>
  );
}

function AlertForm({ onClose }: { onClose: () => void }) {
  const [title, setTitle] = useState('');
  const [detail, setDetail] = useState('');
  const [severity, setSeverity] = useState('warn');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!supabase) return;
    setSaving(true);
    setError(null);
    const { error: err } = await supabase.from('alerts').insert({ title: title.trim(), detail: detail.trim(), severity });
    setSaving(false);
    if (err) {
      setError(`บันทึกไม่สำเร็จ: ${err.message}`);
      return;
    }
    notifyDataChanged();
    onClose();
  }

  return (
    <form onSubmit={submit} style={{ padding: 12, borderRadius: 8, border: '1px solid oklch(0.9 0.01 265)', background: 'oklch(0.99 0.003 265)', marginBottom: 12 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 10 }}>
        <Field label="หัวข้อ" wide><TextInput required value={title} onChange={(e) => setTitle(e.target.value)} placeholder="เช่น ตรวจวัดก๊าซเกินเกณฑ์ — ถัง T-204" /></Field>
        <Field label="รายละเอียด" wide><TextInput value={detail} onChange={(e) => setDetail(e.target.value)} placeholder="สิ่งที่ต้องดำเนินการ" /></Field>
        <Field label="ความเร่งด่วน">
          <Select value={severity} onChange={(e) => setSeverity(e.target.value)}>
            {SEVERITIES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </Select>
        </Field>
      </div>
      {error && <FormMessage error style={{ marginTop: 8 }}>{error}</FormMessage>}
      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 10 }}>
        <Button variant="outline" onClick={onClose} style={{ padding: '5px 11px', fontSize: 12 }}>ยกเลิก</Button>
        <Button type="submit" disabled={saving} style={{ padding: '5px 11px', fontSize: 12 }}>{saving ? 'กำลังบันทึก...' : 'บันทึก'}</Button>
      </div>
    </form>
  );
}
