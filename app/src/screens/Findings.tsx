import { useState, type FormEvent } from 'react';
import { Button, Field, FormMessage, Select, TextArea, TextInput } from '../components/form';
import { Card, CardTitle, DataState, Pill, StatTile, TableHead, TableRow, ellipsis } from '../components/ui';
import { FINDING_CATEGORIES } from '../data';
import { useCan } from '../hooks/useAuth';
import { notifyDataChanged, useContractors, useFindingDetails, usePermits } from '../hooks/useData';
import { localDate, sameMonth } from '../lib/stats';
import { riskTone, supabase, type Contractor, type FindingDetail, type Permit, type Severity } from '../lib/supabase';
import { C, L, MONO, tone } from '../theme';

const COLS = '92px minmax(0, 1.6fr) minmax(0, 1fr) minmax(0, 1fr) 84px 104px 104px';
const SEVERITIES: Severity[] = ['สูง', 'ปานกลาง', 'ต่ำ'];
const OTHER = '__other__';
const FILTERS = [['open', 'ค้างแก้ไข'], ['resolved', 'แก้ไขแล้ว'], ['all', 'ทั้งหมด']] as const;
type Filter = (typeof FILTERS)[number][0];

/** Local calendar date as YYYY-MM-DD (the format of <input type="date"> and Postgres DATE). */
const today = () => new Date().toLocaleDateString('sv-SE');
const shortDate = (isoDate: string) => localDate(isoDate).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: '2-digit' });
const isOverdue = (f: FindingDetail) => !f.resolved && !!f.due_on && f.due_on < today();

export function Findings() {
  const can = useCan();
  const findings = useFindingDetails();
  const contractors = useContractors();
  const permits = usePermits();
  const [filter, setFilter] = useState<Filter>('open');
  const [adding, setAdding] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const canRecord = can('manage_findings');

  const now = new Date();
  const open = findings.data.filter((f) => !f.resolved);
  const kpis = [
    { label: 'ค้างแก้ไข', value: open.length, dot: C.amb },
    { label: 'เกินกำหนดแก้ไข', value: open.filter(isOverdue).length, dot: C.red },
    { label: 'แก้ไขแล้วเดือนนี้', value: findings.data.filter((f) => f.resolved_at && sameMonth(new Date(f.resolved_at), now)).length, dot: C.grn },
    { label: 'พบทั้งหมด', value: findings.data.length, dot: C.acc },
  ];

  const rows = findings.data
    .filter((f) => (filter === 'open' ? !f.resolved : filter === 'resolved' ? f.resolved : true))
    .sort((a, b) => Number(isOverdue(b)) - Number(isOverdue(a)) || b.found_on.localeCompare(a.found_on) || b.created_at.localeCompare(a.created_at));
  const selected = findings.data.find((f) => f.id === selectedId);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 12 }}>
        {kpis.map((k) => (
          <StatTile key={k.label} label={k.label} value={findings.loading ? '—' : String(k.value)} dot={k.dot} size={24} />
        ))}
      </div>

      {adding && <FindingForm contractors={contractors.data} permits={permits.data} onClose={() => setAdding(false)} />}

      <Card style={{ overflowX: 'auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '13px 18px', borderBottom: `1px solid ${L.headBd}`, flexWrap: 'wrap' }}>
          <CardTitle title="รายการข้อบกพร่อง" sub="คลิกรายการเพื่อดูรายละเอียดและบันทึกการแก้ไข" style={{ flex: 1 }} />
          {FILTERS.map(([value, label]) => {
            const on = filter === value;
            return (
              <div
                key={value}
                onClick={() => setFilter(value)}
                style={{ padding: '5px 11px', borderRadius: 20, fontSize: 11.5, cursor: 'pointer', border: `1px solid ${on ? C.ink : C.gryBd}`, background: on ? C.ink : '#fff', color: on ? '#fff' : C.gryFg }}
              >
                {label}
              </div>
            );
          })}
          {canRecord && (
            <Button disabled={adding} onClick={() => setAdding(true)} style={{ padding: '6px 12px', fontSize: 12 }}>+ บันทึกข้อบกพร่อง</Button>
          )}
        </div>
        <TableHead columns={COLS} minWidth={940} labels={['วันที่พบ', 'ข้อบกพร่อง', 'ผู้รับเหมา', 'พื้นที่ / Permit', 'ความรุนแรง', 'กำหนดแก้ไข', 'สถานะ']} />
        <DataState
          loading={findings.loading}
          error={findings.error}
          count={rows.length}
          empty={filter === 'open' ? 'ไม่มีข้อบกพร่องค้างแก้ไข' : 'ยังไม่มีข้อมูล'}
        />
        {rows.map((f) => {
          const on = f.id === selectedId;
          const overdue = isOverdue(f);
          return (
            <TableRow
              key={f.id}
              columns={COLS}
              minWidth={940}
              onClick={() => setSelectedId(on ? null : f.id)}
              style={{ cursor: 'pointer', background: on ? 'oklch(0.97 0.018 265)' : undefined, borderLeft: `3px solid ${on ? C.acc : 'transparent'}` }}
            >
              <div style={{ fontFamily: MONO, fontSize: 11.5, color: 'oklch(0.5 0.02 265)' }}>{shortDate(f.found_on)}</div>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 12.5, fontWeight: 500, ...ellipsis }}>{f.category}</div>
                {f.detail && <div style={{ fontSize: 11, color: 'oklch(0.55 0.02 265)', ...ellipsis }}>{f.detail}</div>}
              </div>
              <div style={{ fontSize: 12, color: 'oklch(0.42 0.02 265)', ...ellipsis }}>{f.contractors?.name ?? '—'}</div>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 12, color: 'oklch(0.45 0.02 265)', ...ellipsis }}>{f.area || '—'}</div>
                {f.permits && <div style={{ fontFamily: MONO, fontSize: 10.5, color: 'oklch(0.45 0.1 265)' }}>{f.permits.permit_no}</div>}
              </div>
              <div><Pill t={riskTone(f.severity)}>{f.severity}</Pill></div>
              <div style={{ fontFamily: MONO, fontSize: 11.5, color: overdue ? tone('bad').fg : 'oklch(0.5 0.02 265)', fontWeight: overdue ? 600 : 400 }}>
                {f.due_on ? shortDate(f.due_on) : '—'}
              </div>
              <div><Pill t={f.resolved ? 'ok' : overdue ? 'bad' : 'warn'}>{f.resolved ? 'แก้ไขแล้ว' : overdue ? 'เกินกำหนด' : 'ค้างแก้ไข'}</Pill></div>
            </TableRow>
          );
        })}
      </Card>

      {selected && <FindingDetailCard key={selected.id} finding={selected} canResolve={canRecord} canDelete={canRecord} onClose={() => setSelectedId(null)} />}
    </div>
  );
}

function FindingForm({ contractors, permits, onClose }: { contractors: Contractor[]; permits: Permit[]; onClose: () => void }) {
  const [category, setCategory] = useState(FINDING_CATEGORIES[0]);
  const [otherCategory, setOtherCategory] = useState('');
  const [contractorId, setContractorId] = useState('');
  const [permitId, setPermitId] = useState('');
  const [area, setArea] = useState('');
  const [severity, setSeverity] = useState<Severity>('ปานกลาง');
  const [foundOn, setFoundOn] = useState(today);
  const [dueOn, setDueOn] = useState('');
  const [detail, setDetail] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const companies = [...contractors].sort((a, b) => a.name.localeCompare(b.name, 'th'));
  const companyPermits = permits
    .filter((p) => p.contractor_id === contractorId && p.status !== 'rejected')
    .sort((a, b) => b.created_at.localeCompare(a.created_at));

  function pickPermit(id: string) {
    setPermitId(id);
    const permit = permits.find((p) => p.id === id);
    if (permit && !area.trim()) setArea(permit.area);
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!supabase) return;
    const finalCategory = category === OTHER ? otherCategory.trim() : category;
    if (!finalCategory) {
      setError('กรุณาระบุประเภทข้อบกพร่อง');
      return;
    }
    if (dueOn && dueOn < foundOn) {
      setError('กำหนดแก้ไขต้องไม่ก่อนวันที่พบ');
      return;
    }
    setSaving(true);
    setError(null);
    const { error: err } = await supabase.from('findings').insert({
      category: finalCategory,
      contractor_id: contractorId,
      permit_id: permitId || null,
      area: area.trim() || null,
      severity,
      found_on: foundOn,
      due_on: dueOn || null,
      detail: detail.trim() || null,
    });
    setSaving(false);
    if (err) {
      setError(`บันทึกไม่สำเร็จ: ${err.message}`);
      return;
    }
    notifyDataChanged();
    onClose();
  }

  return (
    <Card style={{ padding: 18 }}>
      <form onSubmit={submit}>
        <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 14 }}>บันทึกข้อบกพร่องจากการตรวจพื้นที่</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14 }}>
          <Field label="ประเภทข้อบกพร่อง" wide>
            <Select value={category} onChange={(e) => setCategory(e.target.value)}>
              {FINDING_CATEGORIES.map((c) => <option key={c}>{c}</option>)}
              <option value={OTHER}>อื่น ๆ (ระบุเอง)</option>
            </Select>
          </Field>
          {category === OTHER && (
            <Field label="ระบุประเภท" wide><TextInput required value={otherCategory} onChange={(e) => setOtherCategory(e.target.value)} /></Field>
          )}
          <Field label="บริษัทผู้รับเหมา">
            <Select
              required
              value={contractorId}
              onChange={(e) => {
                setContractorId(e.target.value);
                setPermitId('');
              }}
            >
              <option value="">— เลือกบริษัท —</option>
              {companies.map((c) => <option key={c.id} value={c.id}>{c.name} ({c.code})</option>)}
            </Select>
          </Field>
          <Field label="Permit ที่เกี่ยวข้อง (ถ้ามี)">
            <Select value={permitId} disabled={!contractorId} onChange={(e) => pickPermit(e.target.value)}>
              <option value="">— ไม่ระบุ —</option>
              {companyPermits.map((p) => <option key={p.id} value={p.id}>{p.permit_no} — {p.type}</option>)}
            </Select>
          </Field>
          <Field label="พื้นที่"><TextInput value={area} onChange={(e) => setArea(e.target.value)} placeholder="หน่วยผลิต A — ชั้น 2" /></Field>
          <Field label="ความรุนแรง">
            <Select value={severity} onChange={(e) => setSeverity(e.target.value as Severity)}>
              {SEVERITIES.map((s) => <option key={s}>{s}</option>)}
            </Select>
          </Field>
          <Field label="วันที่พบ"><TextInput required type="date" max={today()} value={foundOn} onChange={(e) => setFoundOn(e.target.value)} /></Field>
          <Field label="กำหนดแก้ไขภายใน"><TextInput type="date" min={foundOn} value={dueOn} onChange={(e) => setDueOn(e.target.value)} /></Field>
          <Field label="รายละเอียด" wide><TextArea value={detail} onChange={(e) => setDetail(e.target.value)} placeholder="สิ่งที่พบ จุดที่พบ และสิ่งที่ต้องแก้ไข" /></Field>
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

function FindingDetailCard({ finding, canResolve, canDelete, onClose }: { finding: FindingDetail; canResolve: boolean; canDelete: boolean; onClose: () => void }) {
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState<'resolve' | 'delete' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const overdue = isOverdue(finding);

  async function resolve() {
    if (!supabase) return;
    if (!note.trim()) {
      setError('กรุณาระบุการแก้ไขที่ทำ');
      return;
    }
    setBusy('resolve');
    setError(null);
    const { error: err } = await supabase.rpc('resolve_finding', { p_finding_id: finding.id, p_note: note.trim() });
    setBusy(null);
    if (err) {
      setError(`บันทึกไม่สำเร็จ: ${err.message}`);
      return;
    }
    notifyDataChanged();
  }

  async function remove() {
    if (!supabase) return;
    if (!window.confirm('ลบข้อบกพร่องนี้ถาวร? ใช้เฉพาะกรณีบันทึกผิด ถ้าแก้ไขแล้วให้กด "ยืนยันแก้ไขแล้ว" แทน')) return;
    setBusy('delete');
    setError(null);
    const { data: rows, error: err } = await supabase.from('findings').delete().eq('id', finding.id).select('id');
    setBusy(null);
    if (err || !rows?.length) {
      setError(`ลบไม่สำเร็จ: ${err?.message ?? 'ไม่มีสิทธิ์ลบรายการนี้'}`);
      return;
    }
    notifyDataChanged();
    onClose();
  }

  const fields: [string, string][] = [
    ['ผู้รับเหมา', finding.contractors?.name ?? '—'],
    ['พื้นที่', finding.area || '—'],
    ['Permit', finding.permits?.permit_no ?? '—'],
    ['วันที่พบ', shortDate(finding.found_on)],
    ['กำหนดแก้ไข', finding.due_on ? `${shortDate(finding.due_on)}${overdue ? ' (เกินกำหนด)' : ''}` : '—'],
    ['ผู้บันทึก', finding.reporter?.full_name ?? '—'],
  ];

  return (
    <Card style={{ padding: 18 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14, flexWrap: 'wrap' }}>
        <div style={{ fontSize: 14, fontWeight: 600 }}>{finding.category}</div>
        <Pill t={riskTone(finding.severity)}>ความรุนแรง{finding.severity}</Pill>
        <Pill t={finding.resolved ? 'ok' : overdue ? 'bad' : 'warn'}>{finding.resolved ? 'แก้ไขแล้ว' : overdue ? 'เกินกำหนด' : 'ค้างแก้ไข'}</Pill>
        <div style={{ flex: 1 }} />
        <Button variant="outline" onClick={onClose} style={{ padding: '5px 11px', fontSize: 12 }}>ปิดหน้าต่าง</Button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 20, alignItems: 'start' }}>
        <div>
          <div style={{ display: 'grid', gridTemplateColumns: '110px minmax(0, 1fr)', gap: '8px 12px', fontSize: 12.5 }}>
            {fields.map(([label, value]) => (
              <div key={label} style={{ display: 'contents' }}>
                <div style={{ color: 'oklch(0.52 0.02 265)' }}>{label}</div>
                <div>{value}</div>
              </div>
            ))}
          </div>
          {finding.detail && (
            <div style={{ marginTop: 12, padding: '10px 12px', borderRadius: 8, background: 'oklch(0.985 0.004 265)', border: `1px solid ${L.headBd}`, fontSize: 12.5, lineHeight: 1.55, whiteSpace: 'pre-wrap' }}>{finding.detail}</div>
          )}
        </div>

        <div>
          {finding.resolved ? (
            <div style={{ padding: '12px 14px', borderRadius: 8, background: tone('ok').bg, border: `1px solid ${tone('ok').bd}` }}>
              <div style={{ fontSize: 12.5, fontWeight: 600, color: tone('ok').fg, marginBottom: 4 }}>
                แก้ไขแล้ว{finding.resolved_at ? ` — ${new Date(finding.resolved_at).toLocaleString('th-TH', { dateStyle: 'medium', timeStyle: 'short' })}` : ''}
              </div>
              {finding.resolver && <div style={{ fontSize: 11.5, color: 'oklch(0.45 0.02 265)', marginBottom: 4 }}>โดย {finding.resolver.full_name}</div>}
              {finding.resolution_note && <div style={{ fontSize: 12.5, lineHeight: 1.55, whiteSpace: 'pre-wrap' }}>{finding.resolution_note}</div>}
            </div>
          ) : canResolve ? (
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}>บันทึกการแก้ไข</div>
              <TextArea rows={3} value={note} onChange={(e) => setNote(e.target.value)} placeholder="สิ่งที่ผู้รับเหมาแก้ไขแล้ว และผลการตรวจซ้ำ" />
              <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                <Button disabled={busy !== null} onClick={resolve}>{busy === 'resolve' ? 'กำลังบันทึก...' : 'ยืนยันแก้ไขแล้ว'}</Button>
              </div>
            </div>
          ) : (
            <div style={{ fontSize: 12.5, color: 'oklch(0.5 0.02 265)' }}>รอ จป. หรือเจ้าของพื้นที่ตรวจซ้ำและยืนยันการแก้ไข</div>
          )}
          {canDelete && (
            <div style={{ marginTop: 14 }}>
              <Button variant="outline" disabled={busy !== null} onClick={remove} style={{ color: tone('bad').fg, fontSize: 12 }}>
                {busy === 'delete' ? 'กำลังลบ...' : 'ลบรายการ (บันทึกผิด)'}
              </Button>
            </div>
          )}
          {error && <FormMessage error style={{ marginTop: 10 }}>{error}</FormMessage>}
        </div>
      </div>
    </Card>
  );
}
