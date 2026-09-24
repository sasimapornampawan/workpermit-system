import { useState, type FormEvent } from 'react';
import { Button, Field, FormMessage, Select, TextArea, TextInput } from '../components/form';
import { Card, DataState, Pill, TableHead, TableRow, ellipsis } from '../components/ui';
import { PERMIT_TYPES } from '../data';
import { notifyDataChanged, useJsaHazards, usePpeItems } from '../hooks/useData';
import { supabase, type JsaHazard, type PpeItem, type Severity } from '../lib/supabase';
import { C, L, tone } from '../theme';

const LEVELS: Severity[] = ['สูง', 'ปานกลาง', 'ต่ำ'];
const ALL_TYPES = '__all__';
const HAZARD_COLS = 'minmax(0, 1fr) minmax(0, 1.3fr) 90px 120px 120px';
const PPE_COLS = 'minmax(0, 1fr) 120px 120px 120px';

const typeName = (code: string | null) => (code ? PERMIT_TYPES.find((t) => t.code === code)?.name ?? code : 'ทุกประเภทงาน');

/** Rows for one permit type: its own rows plus the ones that apply to every type. */
const forType = <T extends { permit_type_code: string | null; sort: number }>(rows: T[], code: string | null) =>
  rows
    .filter((r) => (code === ALL_TYPES ? true : r.permit_type_code === null || r.permit_type_code === code))
    .sort((a, b) => (a.permit_type_code ?? '').localeCompare(b.permit_type_code ?? '') || a.sort - b.sort);

export function SafetyCatalog() {
  const hazards = useJsaHazards();
  const ppe = usePpeItems();
  const [typeCode, setTypeCode] = useState<string>(ALL_TYPES);
  const [message, setMessage] = useState<{ error: boolean; text: string } | null>(null);

  const visibleHazards = forType(hazards.data, typeCode);
  const visiblePpe = forType(ppe.data, typeCode);

  async function remove(table: 'jsa_hazards' | 'ppe_items', id: string, label: string) {
    if (!supabase || !window.confirm(`ลบ "${label}" ออกจากรายการ?`)) return;
    const { data: rows, error } = await supabase.from(table).delete().eq('id', id).select('id');
    if (error || !rows?.length) {
      setMessage({ error: true, text: `ลบไม่สำเร็จ: ${error?.message ?? 'ไม่มีสิทธิ์'}` });
      return;
    }
    setMessage({ error: false, text: `ลบ "${label}" แล้ว` });
    notifyDataChanged();
  }

  async function toggleActive(table: 'jsa_hazards' | 'ppe_items', id: string, active: boolean) {
    if (!supabase) return;
    const { error } = await supabase.from(table).update({ active }).eq('id', id);
    if (error) {
      setMessage({ error: true, text: `บันทึกไม่สำเร็จ: ${error.message}` });
      return;
    }
    notifyDataChanged();
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <Card style={{ padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: 220 }}>
          <div style={{ fontSize: 13, fontWeight: 600 }}>รายการที่ใช้ในขั้นตอนประเมินความเสี่ยงของ Permit</div>
          <div style={{ fontSize: 11.5, color: C.mut }}>เลือกประเภทงานเพื่อดูรายการที่ผู้ขอ Permit จะเห็น รายการ "ทุกประเภทงาน" จะแสดงในทุกงาน</div>
        </div>
        <Select value={typeCode} onChange={(e) => setTypeCode(e.target.value)} aria-label="ประเภทงาน" style={{ width: 280 }}>
          <option value={ALL_TYPES}>— ดูทั้งหมด —</option>
          {PERMIT_TYPES.map((t) => <option key={t.code} value={t.code}>{t.name} ({t.code})</option>)}
        </Select>
      </Card>

      {message && <FormMessage error={message.error}>{message.text}</FormMessage>}

      <HazardSection
        rows={visibleHazards}
        loading={hazards.loading}
        error={hazards.error}
        defaultType={typeCode}
        onRemove={(id, label) => remove('jsa_hazards', id, label)}
        onToggle={(id, active) => toggleActive('jsa_hazards', id, active)}
      />

      <PpeSection
        rows={visiblePpe}
        loading={ppe.loading}
        error={ppe.error}
        defaultType={typeCode}
        onRemove={(id, label) => remove('ppe_items', id, label)}
        onToggle={(id, active) => toggleActive('ppe_items', id, active)}
      />
    </div>
  );
}

function TypeField({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <Field label="ใช้กับประเภทงาน">
      <Select value={value} onChange={(e) => onChange(e.target.value)}>
        <option value={ALL_TYPES}>ทุกประเภทงาน</option>
        {PERMIT_TYPES.map((t) => <option key={t.code} value={t.code}>{t.name} ({t.code})</option>)}
      </Select>
    </Field>
  );
}

const typeValue = (code: string) => (code === ALL_TYPES ? null : code);

function HazardSection({ rows, loading, error, defaultType, onRemove, onToggle }: {
  rows: JsaHazard[]; loading: boolean; error: string | null; defaultType: string;
  onRemove: (id: string, label: string) => void; onToggle: (id: string, active: boolean) => void;
}) {
  const [editing, setEditing] = useState<JsaHazard | 'new' | null>(null);

  return (
    <Card style={{ overflowX: 'auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '13px 18px', borderBottom: `1px solid ${L.headBd}` }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 14, fontWeight: 600 }}>อันตรายและมาตรการควบคุม (JSA)</div>
          <div style={{ fontSize: 11.5, color: C.mut }}>{rows.length} รายการ</div>
        </div>
        <Button disabled={editing === 'new'} onClick={() => setEditing('new')} style={{ padding: '6px 12px', fontSize: 12 }}>+ เพิ่มอันตราย</Button>
      </div>

      {editing && (
        <div style={{ padding: 18, borderBottom: `1px solid ${L.headBd}`, background: 'oklch(0.99 0.003 265)' }}>
          <HazardForm hazard={editing === 'new' ? null : editing} defaultType={defaultType} onClose={() => setEditing(null)} />
        </div>
      )}

      <TableHead columns={HAZARD_COLS} minWidth={860} labels={['อันตราย', 'มาตรการควบคุม', 'ระดับ', 'ประเภทงาน', '']} />
      <DataState loading={loading} error={error} count={rows.length} empty="ยังไม่มีรายการสำหรับประเภทงานนี้" />
      {rows.map((h) => (
        <TableRow key={h.id} columns={HAZARD_COLS} minWidth={860} hover={false} style={{ opacity: h.active ? 1 : 0.55 }}>
          <div style={{ fontSize: 12.5, fontWeight: 500 }}>{h.hazard}</div>
          <div style={{ fontSize: 12, color: 'oklch(0.45 0.02 265)', lineHeight: 1.5 }}>{h.control}</div>
          <div><Pill t={h.level === 'สูง' ? 'bad' : h.level === 'ปานกลาง' ? 'warn' : 'ok'}>{h.level}</Pill></div>
          <div style={{ fontSize: 11.5, color: 'oklch(0.5 0.02 265)', ...ellipsis }}>{typeName(h.permit_type_code)}</div>
          <RowActions active={h.active} onEdit={() => setEditing(h)} onToggle={() => onToggle(h.id, !h.active)} onRemove={() => onRemove(h.id, h.hazard)} />
        </TableRow>
      ))}
    </Card>
  );
}

function HazardForm({ hazard, defaultType, onClose }: { hazard: JsaHazard | null; defaultType: string; onClose: () => void }) {
  const [form, setForm] = useState({
    hazard: hazard?.hazard ?? '',
    control: hazard?.control ?? '',
    level: hazard?.level ?? ('ปานกลาง' as Severity),
    type: hazard ? hazard.permit_type_code ?? ALL_TYPES : defaultType,
    sort: String(hazard?.sort ?? 0),
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!supabase) return;
    setSaving(true);
    setError(null);
    const values = {
      hazard: form.hazard.trim(),
      control: form.control.trim(),
      level: form.level,
      permit_type_code: typeValue(form.type),
      sort: Number(form.sort) || 0,
    };
    const { data: rows, error: err } = hazard
      ? await supabase.from('jsa_hazards').update(values).eq('id', hazard.id).select('id')
      : await supabase.from('jsa_hazards').insert(values).select('id');
    setSaving(false);
    if (err || !rows?.length) {
      setError(`บันทึกไม่สำเร็จ: ${err?.message ?? 'ไม่มีสิทธิ์แก้ไขรายการนี้'}`);
      return;
    }
    notifyDataChanged();
    onClose();
  }

  return (
    <form onSubmit={submit}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
        <Field label="อันตราย" wide><TextInput required value={form.hazard} onChange={(e) => setForm({ ...form, hazard: e.target.value })} placeholder="เช่น ประกายไฟติดวัสดุไวไฟ" /></Field>
        <Field label="มาตรการควบคุม" wide><TextArea required rows={2} value={form.control} onChange={(e) => setForm({ ...form, control: e.target.value })} /></Field>
        <TypeField value={form.type} onChange={(type) => setForm({ ...form, type })} />
        <Field label="ระดับความเสี่ยง">
          <Select value={form.level} onChange={(e) => setForm({ ...form, level: e.target.value as Severity })}>
            {LEVELS.map((l) => <option key={l}>{l}</option>)}
          </Select>
        </Field>
        <Field label="ลำดับการแสดง"><TextInput type="number" min={0} value={form.sort} onChange={(e) => setForm({ ...form, sort: e.target.value })} /></Field>
      </div>
      {error && <FormMessage error style={{ marginTop: 10 }}>{error}</FormMessage>}
      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 12 }}>
        <Button variant="outline" onClick={onClose}>ยกเลิก</Button>
        <Button type="submit" disabled={saving}>{saving ? 'กำลังบันทึก...' : 'บันทึก'}</Button>
      </div>
    </form>
  );
}

function PpeSection({ rows, loading, error, defaultType, onRemove, onToggle }: {
  rows: PpeItem[]; loading: boolean; error: string | null; defaultType: string;
  onRemove: (id: string, label: string) => void; onToggle: (id: string, active: boolean) => void;
}) {
  const [editing, setEditing] = useState<PpeItem | 'new' | null>(null);

  return (
    <Card style={{ overflowX: 'auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '13px 18px', borderBottom: `1px solid ${L.headBd}` }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 14, fontWeight: 600 }}>อุปกรณ์คุ้มครองความปลอดภัยส่วนบุคคล (PPE)</div>
          <div style={{ fontSize: 11.5, color: C.mut }}>{rows.length} รายการ</div>
        </div>
        <Button disabled={editing === 'new'} onClick={() => setEditing('new')} style={{ padding: '6px 12px', fontSize: 12 }}>+ เพิ่มอุปกรณ์</Button>
      </div>

      {editing && (
        <div style={{ padding: 18, borderBottom: `1px solid ${L.headBd}`, background: 'oklch(0.99 0.003 265)' }}>
          <PpeForm item={editing === 'new' ? null : editing} defaultType={defaultType} onClose={() => setEditing(null)} />
        </div>
      )}

      <TableHead columns={PPE_COLS} minWidth={700} labels={['อุปกรณ์', 'บังคับใช้', 'ประเภทงาน', '']} />
      <DataState loading={loading} error={error} count={rows.length} empty="ยังไม่มีรายการสำหรับประเภทงานนี้" />
      {rows.map((p) => (
        <TableRow key={p.id} columns={PPE_COLS} minWidth={700} hover={false} style={{ opacity: p.active ? 1 : 0.55 }}>
          <div style={{ fontSize: 12.5, fontWeight: 500 }}>{p.label}</div>
          <div><Pill t={p.required ? 'info' : 'flat'}>{p.required ? 'บังคับ' : 'ตามความเหมาะสม'}</Pill></div>
          <div style={{ fontSize: 11.5, color: 'oklch(0.5 0.02 265)', ...ellipsis }}>{typeName(p.permit_type_code)}</div>
          <RowActions active={p.active} onEdit={() => setEditing(p)} onToggle={() => onToggle(p.id, !p.active)} onRemove={() => onRemove(p.id, p.label)} />
        </TableRow>
      ))}
    </Card>
  );
}

function PpeForm({ item, defaultType, onClose }: { item: PpeItem | null; defaultType: string; onClose: () => void }) {
  const [form, setForm] = useState({
    label: item?.label ?? '',
    required: item?.required ?? true,
    type: item ? item.permit_type_code ?? ALL_TYPES : defaultType,
    sort: String(item?.sort ?? 0),
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!supabase) return;
    setSaving(true);
    setError(null);
    const values = { label: form.label.trim(), required: form.required, permit_type_code: typeValue(form.type), sort: Number(form.sort) || 0 };
    const { data: rows, error: err } = item
      ? await supabase.from('ppe_items').update(values).eq('id', item.id).select('id')
      : await supabase.from('ppe_items').insert(values).select('id');
    setSaving(false);
    if (err || !rows?.length) {
      setError(`บันทึกไม่สำเร็จ: ${err?.message ?? 'ไม่มีสิทธิ์แก้ไขรายการนี้'}`);
      return;
    }
    notifyDataChanged();
    onClose();
  }

  return (
    <form onSubmit={submit}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
        <Field label="ชื่ออุปกรณ์" wide><TextInput required value={form.label} onChange={(e) => setForm({ ...form, label: e.target.value })} placeholder="เช่น หน้ากากกรองฟูม" /></Field>
        <TypeField value={form.type} onChange={(type) => setForm({ ...form, type })} />
        <Field label="ลำดับการแสดง"><TextInput type="number" min={0} value={form.sort} onChange={(e) => setForm({ ...form, sort: e.target.value })} /></Field>
      </div>
      <label style={{ display: 'flex', alignItems: 'center', gap: 7, marginTop: 12, fontSize: 12.5, cursor: 'pointer' }}>
        <input type="checkbox" checked={form.required} onChange={(e) => setForm({ ...form, required: e.target.checked })} />
        บังคับใช้ทุกครั้ง
      </label>
      {error && <FormMessage error style={{ marginTop: 10 }}>{error}</FormMessage>}
      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 12 }}>
        <Button variant="outline" onClick={onClose}>ยกเลิก</Button>
        <Button type="submit" disabled={saving}>{saving ? 'กำลังบันทึก...' : 'บันทึก'}</Button>
      </div>
    </form>
  );
}

function RowActions({ active, onEdit, onToggle, onRemove }: { active: boolean; onEdit: () => void; onToggle: () => void; onRemove: () => void }) {
  const link = { border: 'none', background: 'none', padding: 0, fontSize: 11.5, cursor: 'pointer', fontFamily: 'inherit' } as const;
  return (
    <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
      <button type="button" className="h-underline" onClick={onEdit} style={{ ...link, color: 'oklch(0.45 0.12 265)' }}>แก้ไข</button>
      <button type="button" className="h-underline" onClick={onToggle} style={{ ...link, color: C.mut }}>{active ? 'ซ่อน' : 'แสดง'}</button>
      <button type="button" className="h-underline" onClick={onRemove} style={{ ...link, color: tone('bad').fg }}>ลบ</button>
    </div>
  );
}
