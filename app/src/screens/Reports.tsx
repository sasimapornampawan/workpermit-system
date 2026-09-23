import { useState, type FormEvent } from 'react';
import { BRAND } from '../brand';
import { BrandMark } from '../components/BrandMark';
import { Button, Field, FormMessage, Select, TextInput } from '../components/form';
import { Bar, Card, DataState, StatTile, TableHead, TableRow, ellipsis } from '../components/ui';
import { useCan } from '../hooks/useAuth';
import { notifyDataChanged, useContractors, useFindings, useMonthlyReports, usePermits, useRecommendations } from '../hooks/useData';
import { printWith } from '../lib/print';
import { countBy, localDate, pct, sameMonth } from '../lib/stats';
import { priorityLabel, supabase, type MonthlyReport, type Recommendation } from '../lib/supabase';
import { L, MONO, tone, type Tone } from '../theme';

const RANK_COLS = 'minmax(0, 1fr) 74px 74px 86px';
const PERMIT_COLOR = 'oklch(0.52 0.16 265)';
const INCIDENT_COLOR = 'oklch(0.66 0.16 40)';
const FINDING_COLORS = ['oklch(0.6 0.16 40)', 'oklch(0.66 0.15 50)', 'oklch(0.72 0.14 62)', 'oklch(0.76 0.12 72)', 'oklch(0.8 0.1 82)'];
const PRIORITIES: [string, string][] = [['high', 'สูง'], ['medium', 'กลาง'], ['low', 'ต่ำ']];

const scoreTone = (score: number): Tone => (score >= 85 ? 'ok' : score >= 70 ? 'warn' : 'bad');

/** YYYY-MM, the value format of <input type="month">. */
const monthKey = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
const monthStart = (key: string) => {
  const [year, month] = key.split('-').map(Number);
  return new Date(year, month - 1, 1);
};

export function Reports() {
  const can = useCan();
  const isSafety = can('manage_reports_data');
  const permits = usePermits();
  const contractors = useContractors();
  const findings = useFindings();
  const monthly = useMonthlyReports();
  const recommendations = useRecommendations();
  const [month, setMonth] = useState(() => monthKey(new Date()));

  const selected = monthStart(month);
  const months = Array.from({ length: 6 }, (_, i) => new Date(selected.getFullYear(), selected.getMonth() - 5 + i, 1));
  const windowEnd = new Date(selected.getFullYear(), selected.getMonth() + 1, 1);
  const inWindow = (d: Date) => d >= months[0] && d < windowEnd;
  const windowPermits = permits.data.filter((p) => inWindow(new Date(p.created_at)));
  const windowFindings = findings.data.filter((f) => inWindow(localDate(f.found_on)));

  const bars = months.map((m) => ({
    label: m.toLocaleDateString('th-TH', { month: 'short' }),
    permits: windowPermits.filter((p) => sameMonth(new Date(p.created_at), m)).length,
    findings: windowFindings.filter((f) => sameMonth(localDate(f.found_on), m)).length,
  }));
  const maxBar = Math.max(...bars.flatMap((b) => [b.permits, b.findings]));

  const monthLabel = selected.toLocaleDateString('th-TH', { month: 'long', year: 'numeric' });
  const report = monthly.data.find((r) => r.month.slice(0, 7) === month);
  const reportNote = report ? `ข้อมูลเดือน${monthLabel}` : 'ยังไม่ได้บันทึกตัวเลขเดือนนี้';
  const stats = [
    { label: 'Permit ที่ออกเดือนนี้', value: String(bars[5].permits), note: `6 เดือนล่าสุด ${windowPermits.length} ใบ` },
    { label: 'ชั่วโมงทำงานปลอดอุบัติเหตุ', value: report ? report.safe_hours.toLocaleString('en-US') : '—', note: reportNote },
    { label: 'เหตุการณ์เกือบเกิดอุบัติเหตุ', value: report ? String(report.near_misses) : '—', note: reportNote },
    { label: 'อัตราการปิดงานตรงเวลา', value: report ? `${report.on_time_close_pct}%` : '—', note: reportNote },
    { label: 'ผู้รับเหมาที่ถูกระงับ', value: String(contractors.data.filter((c) => c.status === 'bad').length), note: `จากทั้งหมด ${contractors.data.length} บริษัท (ปัจจุบัน)` },
  ];

  const topFindings = [...countBy(windowFindings, (f) => f.category)].sort((a, b) => b[1] - a[1]).slice(0, 5);
  const maxFinding = Math.max(...topFindings.map(([, n]) => n));

  const permitsByContractor = countBy(windowPermits, (p) => p.contractor_id);
  const findingsByContractor = countBy(windowFindings, (f) => f.contractor_id);
  const ranking = contractors.data
    .filter((c) => c.safety_score !== null)
    .sort((a, b) => (b.safety_score ?? 0) - (a.safety_score ?? 0))
    .slice(0, 5);

  const sortedRecommendations = [...recommendations.data].sort((a, b) => a.sort - b.sort);
  const rangeLabel = `${bars[0].label} ${months[0].toLocaleDateString('th-TH', { year: 'numeric' })} – ${bars[5].label} ${selected.toLocaleDateString('th-TH', { year: 'numeric' })}`;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, maxWidth: 1180 }}>
      <div style={{ background: L.navy, borderRadius: 12, padding: '22px 24px', color: '#fff', display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 20, flexWrap: 'wrap' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
            <BrandMark height={28} />
            <div style={{ fontFamily: MONO, fontSize: 10.5, letterSpacing: '0.12em', color: 'oklch(0.76 0.04 265)' }}>MONTHLY SAFETY REPORT · {BRAND.nameEn}</div>
          </div>
          <div style={{ fontSize: 22, fontWeight: 600, letterSpacing: '-0.01em' }}>รายงานสรุปงานความปลอดภัย ประจำเดือน{monthLabel}</div>
          <div style={{ fontSize: 12.5, color: 'oklch(0.8 0.03 265)', marginTop: 6 }}>
            {BRAND.nameTh} ({BRAND.site}) — จัดทำโดยแผนกความปลอดภัย อาชีวอนามัย และสภาพแวดล้อมในการทำงาน
          </div>
        </div>
        <div className="no-print" style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <input
            type="month"
            value={month}
            max={monthKey(new Date())}
            onChange={(e) => e.target.value && setMonth(e.target.value)}
            aria-label="เลือกเดือนของรายงาน"
            style={{ padding: '7px 10px', borderRadius: 7, border: 'none', background: 'oklch(0.32 0.05 265)', color: '#fff', fontSize: 12.5, colorScheme: 'dark' }}
          />
          <div
            role="button"
            tabIndex={0}
            onClick={() => printWith('report')}
            onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && printWith('report')}
            style={{ padding: '8px 14px', borderRadius: 7, background: '#fff', color: 'oklch(0.25 0.04 265)', fontSize: 12.5, fontWeight: 500, cursor: 'pointer', whiteSpace: 'nowrap' }}
          >
            ส่งออก PDF
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(168px, 1fr))', gap: 12 }}>
        {stats.map((s) => <StatTile key={s.label} {...s} size={25} />)}
      </div>

      {isSafety && <MonthlyFigures key={month} month={month} monthLabel={monthLabel} report={report} />}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(330px, 1fr))', gap: 16, alignItems: 'start' }}>
        <Card style={{ padding: '16px 18px' }}>
          <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 2 }}>จำนวน Permit และข้อบกพร่อง รายเดือน</div>
          <div style={{ fontSize: 11.5, color: 'oklch(0.56 0.02 265)', marginBottom: 18 }}>{rangeLabel}</div>
          <DataState loading={permits.loading || findings.loading} error={permits.error ?? findings.error} count={maxBar} empty="ไม่มี Permit หรือข้อบกพร่องในช่วงนี้" style={{ padding: '0 0 12px' }} />
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 14, height: 172, paddingBottom: 22, borderBottom: '1px solid oklch(0.92 0.01 265)', position: 'relative' }}>
            {bars.map((m) => (
              <div key={m.label} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, height: '100%', justifyContent: 'flex-end' }}>
                <div style={{ fontFamily: MONO, fontSize: 10.5, color: 'oklch(0.5 0.02 265)' }}>{m.permits}</div>
                <div style={{ width: '100%', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', gap: 3, height: pct(Math.max(m.permits, m.findings), maxBar) }}>
                  <div style={{ flex: 1, maxWidth: 26, height: pct(m.permits, Math.max(m.permits, m.findings)), background: PERMIT_COLOR, borderRadius: '4px 4px 0 0' }} />
                  <div style={{ flex: '0 0 8px', height: pct(m.findings, Math.max(m.permits, m.findings)), background: INCIDENT_COLOR, borderRadius: '3px 3px 0 0' }} />
                </div>
                <div style={{ fontSize: 11, color: 'oklch(0.5 0.02 265)', position: 'absolute', bottom: 0 }}>{m.label}</div>
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 18, marginTop: 12 }}>
            <Legend color={PERMIT_COLOR} label="Permit ที่ออก" />
            <Legend color={INCIDENT_COLOR} label="ข้อบกพร่องที่พบ" />
          </div>
        </Card>

        <Card style={{ padding: '16px 18px' }}>
          <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 2 }}>ข้อบกพร่องที่พบบ่อยจากการตรวจพื้นที่</div>
          <div style={{ fontSize: 11.5, color: 'oklch(0.56 0.02 265)', marginBottom: 14 }}>{rangeLabel}</div>
          <DataState loading={findings.loading} error={findings.error} count={topFindings.length} empty="ไม่พบข้อบกพร่องในช่วงนี้" style={{ padding: 0 }} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {topFindings.map(([label, n], i) => (
              <div key={label}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 5 }}>
                  <div style={{ fontSize: 12.5 }}>{label}</div>
                  <div style={{ fontFamily: MONO, fontSize: 11.5, color: 'oklch(0.45 0.02 265)' }}>{n}</div>
                </div>
                <Bar pct={pct(n, maxFinding)} color={FINDING_COLORS[i]} height={7} radius={4} />
              </div>
            ))}
          </div>
        </Card>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(330px, 1fr))', gap: 16, alignItems: 'start' }}>
        <Card style={{ overflowX: 'auto' }}>
          <div style={{ padding: '13px 18px', borderBottom: `1px solid ${L.headBd}` }}>
            <div style={{ fontSize: 14, fontWeight: 600 }}>ผลการปฏิบัติของผู้รับเหมา 5 อันดับ</div>
            <div style={{ fontSize: 11.5, color: 'oklch(0.56 0.02 265)' }}>Permit และข้อบกพร่อง {rangeLabel} · คะแนนจากทะเบียนผู้รับเหมา</div>
          </div>
          <TableHead columns={RANK_COLS} minWidth={460} gap={10} labels={['ผู้รับเหมา', 'Permit', 'ข้อบกพร่อง', 'คะแนน']} />
          <DataState loading={contractors.loading} error={contractors.error} count={ranking.length} empty="ยังไม่ได้ให้คะแนนผู้รับเหมา (แก้ไขได้ที่เมนูผู้รับเหมา)" />
          {ranking.map((c) => {
            const score = c.safety_score ?? 0;
            const t = tone(scoreTone(score));
            return (
              <TableRow key={c.id} columns={RANK_COLS} minWidth={460} gap={10} hover={false}>
                <div style={{ fontSize: 12.5, ...ellipsis }}>{c.name}</div>
                <div style={{ fontFamily: MONO, fontSize: 12, color: 'oklch(0.45 0.02 265)' }}>{permitsByContractor.get(c.id) ?? 0}</div>
                <div style={{ fontFamily: MONO, fontSize: 12, color: 'oklch(0.45 0.02 265)' }}>{findingsByContractor.get(c.id) ?? 0}</div>
                <div>
                  <span style={{ fontFamily: MONO, fontSize: 11.5, fontWeight: 500, padding: '2px 8px', borderRadius: 4, background: t.bg, color: t.fg }}>{score}</span>
                </div>
              </TableRow>
            );
          })}
        </Card>

        <RecommendationsCard items={sortedRecommendations} loading={recommendations.loading} error={recommendations.error} canEdit={isSafety} />
      </div>
    </div>
  );
}

function MonthlyFigures({ month, monthLabel, report }: { month: string; monthLabel: string; report: MonthlyReport | undefined }) {
  const [open, setOpen] = useState(false);
  const [safeHours, setSafeHours] = useState(report ? String(report.safe_hours) : '');
  const [nearMisses, setNearMisses] = useState(report ? String(report.near_misses) : '');
  const [onTime, setOnTime] = useState(report ? String(report.on_time_close_pct) : '');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ error: boolean; text: string } | null>(null);

  async function save(e: FormEvent) {
    e.preventDefault();
    if (!supabase) return;
    setSaving(true);
    setMessage(null);
    const { data: rows, error } = await supabase
      .from('monthly_reports')
      .upsert({ month: `${month}-01`, safe_hours: Number(safeHours), near_misses: Number(nearMisses), on_time_close_pct: Number(onTime) }, { onConflict: 'month' })
      .select('month');
    setSaving(false);
    if (error || !rows?.length) {
      setMessage({ error: true, text: `บันทึกไม่สำเร็จ: ${error?.message ?? 'ไม่มีสิทธิ์'}` });
      return;
    }
    setMessage({ error: false, text: `บันทึกตัวเลขเดือน${monthLabel}แล้ว` });
    setOpen(false);
    notifyDataChanged();
  }

  return (
    <Card className="no-print" style={{ padding: '14px 18px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 13, fontWeight: 600 }}>ตัวเลขประจำเดือน{monthLabel}</div>
          <div style={{ fontSize: 11.5, color: 'oklch(0.56 0.02 265)' }}>ชั่วโมงทำงานปลอดอุบัติเหตุ เหตุการณ์เกือบเกิดอุบัติเหตุ และอัตราการปิดงานตรงเวลา (เฉพาะ จป.)</div>
        </div>
        {!open && <Button variant="outline" onClick={() => setOpen(true)} style={{ padding: '6px 12px', fontSize: 12 }}>{report ? 'แก้ไขตัวเลข' : 'บันทึกตัวเลข'}</Button>}
      </div>
      {open && (
        <form onSubmit={save} style={{ marginTop: 12 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
            <Field label="ชั่วโมงทำงานปลอดอุบัติเหตุ"><TextInput required type="number" min={0} value={safeHours} onChange={(e) => setSafeHours(e.target.value)} /></Field>
            <Field label="เหตุการณ์เกือบเกิดอุบัติเหตุ (ครั้ง)"><TextInput required type="number" min={0} value={nearMisses} onChange={(e) => setNearMisses(e.target.value)} /></Field>
            <Field label="อัตราการปิดงานตรงเวลา (%)"><TextInput required type="number" min={0} max={100} value={onTime} onChange={(e) => setOnTime(e.target.value)} /></Field>
          </div>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 12 }}>
            <Button variant="outline" onClick={() => setOpen(false)}>ยกเลิก</Button>
            <Button type="submit" disabled={saving}>{saving ? 'กำลังบันทึก...' : 'บันทึก'}</Button>
          </div>
        </form>
      )}
      {message && <FormMessage error={message.error} style={{ marginTop: 10 }}>{message.text}</FormMessage>}
    </Card>
  );
}

function RecommendationsCard({ items, loading, error, canEdit }: { items: Recommendation[]; loading: boolean; error: string | null; canEdit: boolean }) {
  const [adding, setAdding] = useState(false);
  const [title, setTitle] = useState('');
  const [detail, setDetail] = useState('');
  const [priority, setPriority] = useState('medium');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function add(e: FormEvent) {
    e.preventDefault();
    if (!supabase) return;
    setBusy(true);
    setMessage(null);
    const sort = Math.max(0, ...items.map((r) => r.sort)) + 1;
    const { error: err } = await supabase.from('recommendations').insert({ title: title.trim(), detail: detail.trim(), priority, sort });
    setBusy(false);
    if (err) {
      setMessage(`บันทึกไม่สำเร็จ: ${err.message}`);
      return;
    }
    setTitle('');
    setDetail('');
    setPriority('medium');
    setAdding(false);
    notifyDataChanged();
  }

  async function remove(r: Recommendation) {
    if (!supabase || !window.confirm(`ลบข้อเสนอ "${r.title}"?`)) return;
    setBusy(true);
    setMessage(null);
    const { data: rows, error: err } = await supabase.from('recommendations').delete().eq('id', r.id).select('id');
    setBusy(false);
    if (err || !rows?.length) {
      setMessage(`ลบไม่สำเร็จ: ${err?.message ?? 'ไม่มีสิทธิ์'}`);
      return;
    }
    notifyDataChanged();
  }

  return (
    <Card style={{ padding: '16px 18px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
        <div style={{ fontSize: 14, fontWeight: 600, flex: 1 }}>ข้อเสนอต่อผู้บริหาร</div>
        {canEdit && !adding && (
          <Button variant="outline" className="no-print" onClick={() => setAdding(true)} style={{ padding: '5px 10px', fontSize: 11.5 }}>+ เพิ่มข้อเสนอ</Button>
        )}
      </div>

      {adding && (
        <form onSubmit={add} className="no-print" style={{ padding: 12, borderRadius: 8, border: '1px solid oklch(0.9 0.01 265)', background: 'oklch(0.99 0.003 265)', marginBottom: 12 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 10 }}>
            <Field label="หัวข้อ" wide><TextInput required value={title} onChange={(e) => setTitle(e.target.value)} /></Field>
            <Field label="เหตุผล / รายละเอียด" wide><TextInput required value={detail} onChange={(e) => setDetail(e.target.value)} /></Field>
            <Field label="ความสำคัญ">
              <Select value={priority} onChange={(e) => setPriority(e.target.value)}>
                {PRIORITIES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </Select>
            </Field>
          </div>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 10 }}>
            <Button variant="outline" onClick={() => setAdding(false)} style={{ padding: '5px 11px', fontSize: 12 }}>ยกเลิก</Button>
            <Button type="submit" disabled={busy} style={{ padding: '5px 11px', fontSize: 12 }}>{busy ? 'กำลังบันทึก...' : 'บันทึก'}</Button>
          </div>
        </form>
      )}

      <DataState loading={loading} error={error} count={items.length} empty="ยังไม่มีข้อเสนอ" style={{ padding: 0 }} />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 11 }}>
        {items.map((r, i) => {
          const [label, priorityTone] = priorityLabel(r.priority);
          const t = tone(priorityTone);
          return (
            <div key={r.id} style={{ display: 'flex', gap: 11, paddingBottom: 11, borderBottom: '1px solid oklch(0.96 0.008 265)' }}>
              <div style={{ fontFamily: MONO, fontSize: 11, fontWeight: 600, color: 'oklch(0.5 0.12 265)', flex: '0 0 18px', paddingTop: 1 }}>{String(i + 1).padStart(2, '0')}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12.5, fontWeight: 500, marginBottom: 3 }}>{r.title}</div>
                <div style={{ fontSize: 11.5, color: 'oklch(0.48 0.02 265)', lineHeight: 1.55 }}>{r.detail}</div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6 }}>
                <div style={{ fontSize: 10.5, fontWeight: 500, padding: '2px 8px', borderRadius: 4, height: 'fit-content', background: t.bg, color: t.fg, whiteSpace: 'nowrap' }}>{label}</div>
                {canEdit && (
                  <button
                    type="button"
                    className="no-print h-underline"
                    disabled={busy}
                    onClick={() => remove(r)}
                    style={{ border: 'none', background: 'none', padding: 0, fontSize: 11, color: tone('bad').fg, cursor: busy ? 'default' : 'pointer' }}
                  >
                    ลบ
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
      {message && <FormMessage error style={{ marginTop: 10 }}>{message}</FormMessage>}
    </Card>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 11.5, color: 'oklch(0.48 0.02 265)' }}>
      <div style={{ width: 10, height: 10, borderRadius: 3, background: color }} /> {label}
    </div>
  );
}
