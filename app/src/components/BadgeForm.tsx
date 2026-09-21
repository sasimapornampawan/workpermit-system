import { useState, type ChangeEvent, type FormEvent } from 'react';
import { useProfile } from '../hooks/useAuth';
import { notifyDataChanged } from '../hooks/useData';
import { BADGE_KINDS, BADGE_TIERS, supabase, type Badge, type Contractor } from '../lib/supabase';
import { Button, Field, FormMessage, Select, TextInput } from './form';
import { Card } from './ui';

const TRAINING_STATUS: [string, string][] = [['ok', 'ผ่านครบ'], ['warn', 'ผ่านบางส่วน / รอตรวจสอบ'], ['bad', 'หมดอายุ / ไม่ผ่าน']];
const REQUEST_STATUS: [string, string][] = [['pending_docs', 'รอเอกสาร'], ['pending_training', 'รออบรมเพิ่ม'], ['ready', 'พร้อมออกบัตร'], ['rejected', 'ตีกลับ']];

type FormState = {
  company: string; name: string; id_no: string; role: string; kind: string; tier: string; perms: string;
  training: string; training_status: string; status: string; expiry: string; card_no: string;
};

const toForm = (b: Badge | null): FormState => ({
  company: b?.company ?? '',
  name: b?.name ?? '',
  id_no: b?.id_no ?? '',
  role: b?.role ?? '',
  kind: b?.kind ?? BADGE_KINDS[0],
  tier: b?.tier ?? BADGE_TIERS[0],
  perms: b?.perms.join(', ') ?? '',
  training: b?.training ?? '',
  training_status: b?.training_status ?? 'warn',
  status: b?.status ?? 'pending_docs',
  expiry: b?.expiry ?? '',
  card_no: b?.card_no ?? '',
});

/** badge = null creates a request; a contractor can only create, for their own company. */
export function BadgeForm({ badge, contractors, onClose }: { badge: Badge | null; contractors: Contractor[]; onClose: () => void }) {
  const profile = useProfile();
  const isSafety = profile.role === 'safety';
  const ownCompany = contractors.find((c) => c.id === profile.contractor_id)?.name ?? '';
  const [form, setForm] = useState<FormState>(() => toForm(badge));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const set = (key: keyof FormState) => (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setForm({ ...form, [key]: e.target.value });

  const statusOptions = badge?.status === 'issued' ? [...REQUEST_STATUS, ['issued', 'ออกบัตรแล้ว'] as [string, string]] : REQUEST_STATUS;

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!supabase) return;
    const company = isSafety ? form.company : ownCompany;
    if (!company) {
      setError(isSafety ? 'กรุณาเลือกบริษัท' : 'ไม่พบบริษัทของบัญชีนี้ กรุณาติดต่อ จป.');
      return;
    }
    const fields = {
      company,
      name: form.name.trim(),
      id_no: form.id_no.trim() || null,
      role: form.role.trim() || null,
      kind: form.kind,
      tier: form.tier,
      perms: form.perms.split(',').map((p) => p.trim()).filter(Boolean),
      ...(isSafety
        ? { training: form.training.trim() || 'รอตรวจสอบ', training_status: form.training_status, status: form.status, expiry: form.expiry.trim() || null }
        : {}),
    };

    setSaving(true);
    setError(null);
    const { data: rows, error: err } = badge
      ? await supabase
        .from('badges')
        .update({ ...fields, ...(form.card_no.trim() ? { card_no: form.card_no.trim() } : {}) })
        .eq('id', badge.id)
        .select('id')
      : await supabase.from('badges').insert(fields).select('id');
    setSaving(false);

    if (err) {
      setError(err.code === '23505' ? 'เลขที่บัตรนี้มีอยู่แล้ว' : `บันทึกไม่สำเร็จ: ${err.message}`);
      return;
    }
    if (!rows?.length) {
      setError('ไม่มีสิทธิ์บันทึกรายการนี้');
      return;
    }
    notifyDataChanged();
    onClose();
  }

  const companies = [...contractors].sort((a, b) => a.name.localeCompare(b.name, 'th'));

  return (
    <Card style={{ padding: 18 }}>
      <form onSubmit={submit}>
        <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 3 }}>{badge ? `แก้ไขคำขอบัตร ${badge.card_no ?? ''}` : 'เพิ่มคำขอบัตร'}</div>
        <div style={{ fontSize: 11.5, color: 'oklch(0.56 0.02 265)', marginBottom: 14 }}>
          {isSafety ? 'เลขที่บัตรออกให้อัตโนมัติเมื่อบันทึก' : 'คำขอจะเข้าสถานะ "รอเอกสาร" แล้ว จป. จะตรวจสอบผลอบรมก่อนออกบัตร'}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14 }}>
          <Field label="บริษัทผู้รับเหมา" wide>
            {isSafety ? (
              <Select required value={form.company} onChange={set('company')}>
                <option value="">— เลือกบริษัท —</option>
                {companies.map((c) => <option key={c.id} value={c.name}>{c.name} ({c.code})</option>)}
              </Select>
            ) : (
              <TextInput value={ownCompany} disabled />
            )}
          </Field>
          <Field label="ชื่อ-สกุล"><TextInput required value={form.name} onChange={set('name')} placeholder="นาย..." /></Field>
          <Field label="เลขบัตรประชาชน"><TextInput value={form.id_no} onChange={set('id_no')} placeholder="1-3299-xxxxx-42" /></Field>
          <Field label="ตำแหน่ง / หน้าที่"><TextInput value={form.role} onChange={set('role')} placeholder="ช่างเชื่อม" /></Field>
          <Field label="ประเภทผู้ปฏิบัติงาน">
            <Select value={form.kind} onChange={set('kind')}>{BADGE_KINDS.map((k) => <option key={k}>{k}</option>)}</Select>
          </Field>
          <Field label="ระดับบัตร">
            <Select value={form.tier} onChange={set('tier')}>{BADGE_TIERS.map((t) => <option key={t}>{t}</option>)}</Select>
          </Field>
          <Field label="สิทธิ์การเข้าทำงาน (คั่นด้วย ,)" wide>
            <TextInput value={form.perms} onChange={set('perms')} placeholder="งานความร้อน, งานที่สูง, พื้นที่ผลิต A" />
          </Field>
          {isSafety && (
            <>
              <Field label="ผลการอบรม"><TextInput value={form.training} onChange={set('training')} placeholder="ผ่าน 3/3" /></Field>
              <Field label="สถานะผลอบรม">
                <Select value={form.training_status} onChange={set('training_status')}>
                  {TRAINING_STATUS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                </Select>
              </Field>
              <Field label="สถานะคำขอ">
                <Select value={form.status} onChange={set('status')}>
                  {statusOptions.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                </Select>
              </Field>
              <Field label="วันหมดอายุบัตร"><TextInput value={form.expiry} onChange={set('expiry')} placeholder="31 ส.ค. 2570" /></Field>
              {badge && <Field label="เลขที่บัตร"><TextInput value={form.card_no} onChange={set('card_no')} /></Field>}
            </>
          )}
        </div>
        {error && <FormMessage error style={{ marginTop: 12 }}>{error}</FormMessage>}
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 16 }}>
          <Button variant="outline" onClick={onClose}>ยกเลิก</Button>
          <Button type="submit" disabled={saving}>{saving ? 'กำลังบันทึก...' : badge ? 'บันทึกการแก้ไข' : 'ส่งคำขอ'}</Button>
        </div>
      </form>
    </Card>
  );
}
