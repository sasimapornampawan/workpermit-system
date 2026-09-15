import { Bar, Card, CardTitle, DataState, Pill, StatTile, TableHead, TableRow, ellipsis } from '../components/ui';
import { DASH_FILTERS } from '../data';
import { useAlerts, useContractors, useFindings, usePermits } from '../hooks/useData';
import { countBy, pct, sameMonth } from '../lib/stats';
import { asTone, permitStatus, riskTone } from '../lib/supabase';
import { C, L, MONO, tone } from '../theme';

const COLS = '118px minmax(0, 1.1fr) minmax(0, 1fr) minmax(0, 0.9fr) 96px 104px 92px';
const BAR_COLORS = ['oklch(0.52 0.16 265)', 'oklch(0.56 0.15 265)', 'oklch(0.6 0.13 265)', 'oklch(0.64 0.12 265)', 'oklch(0.68 0.1 265)', 'oklch(0.72 0.08 265)', 'oklch(0.76 0.06 265)'];
const SEVERITY_ORDER: Record<string, number> = { bad: 0, warn: 1, info: 2 };

function alertTime(iso: string, now: Date) {
  const d = new Date(iso);
  return d.toDateString() === now.toDateString()
    ? d.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })
    : d.toLocaleDateString('th-TH', { day: 'numeric', month: 'short' });
}

export function Dashboard() {
  const permits = usePermits();
  const contractors = useContractors();
  const findings = useFindings();
  const alerts = useAlerts();
  const now = new Date();

  const byStatus = (s: string) => permits.data.filter((p) => p.status === s).length;
  const onSite = contractors.data.filter((c) => c.status !== 'bad');
  const show = (loading: boolean, n: number) => (loading ? '—' : n.toLocaleString('en-US'));
  const kpis = [
    { label: 'Permit ที่ใช้งานอยู่', value: show(permits.loading, byStatus('active')), note: `จาก Permit ทั้งหมด ${permits.data.length} ใบ`, dot: C.acc },
    { label: 'รออนุมัติ', value: show(permits.loading, byStatus('pending')), note: `อนุมัติแล้วรอเริ่มงาน ${byStatus('approved')} ใบ`, dot: C.amb },
    { label: 'ผู้รับเหมาในพื้นที่', value: show(contractors.loading, onSite.reduce((n, c) => n + c.workers, 0)), note: `จาก ${onSite.length} บริษัทที่ไม่ถูกระงับ`, dot: C.grn },
    { label: 'ข้อบกพร่องค้างแก้ไข', value: show(findings.loading, findings.data.filter((f) => !f.resolved).length), note: `พบทั้งหมด ${findings.data.length} รายการ`, dot: C.red },
  ];

  const thisMonth = permits.data.filter((p) => sameMonth(new Date(p.created_at), now));
  const typeBars = [...countBy(thisMonth, (p) => p.type.split(' — ')[0])].sort((a, b) => b[1] - a[1]);
  const maxType = Math.max(...typeBars.map(([, n]) => n));

  const sortedAlerts = [...alerts.data].sort(
    (a, b) => (SEVERITY_ORDER[a.severity] ?? 3) - (SEVERITY_ORDER[b.severity] ?? 3) || b.created_at.localeCompare(a.created_at),
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
        {kpis.map((k) => <StatTile key={k.label} {...k} />)}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(330px, 1fr))', gap: 16 }}>
        <Card style={{ padding: '16px 18px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <CardTitle title="Permit ที่ออกในเดือนนี้ แยกตามประเภทงาน" sub={`${now.toLocaleDateString('th-TH', { month: 'long', year: 'numeric' })} — รวม ${thisMonth.length} ใบ`} />
            <div style={{ fontFamily: MONO, fontSize: 11, color: 'oklch(0.56 0.02 265)' }}>MTD</div>
          </div>
          <DataState loading={permits.loading} error={permits.error} count={typeBars.length} style={{ padding: 0 }} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 11 }}>
            {typeBars.map(([label, n], i) => (
              <div key={label} style={{ display: 'grid', gridTemplateColumns: '150px minmax(0, 1fr) 54px', alignItems: 'center', gap: 12 }}>
                <div style={{ fontSize: 12.5, ...ellipsis }}>{label}</div>
                <Bar pct={pct(n, maxType)} color={BAR_COLORS[i % BAR_COLORS.length]} height={10} radius={5} />
                <div style={{ fontFamily: MONO, fontSize: 12, textAlign: 'right', color: 'oklch(0.4 0.02 265)' }}>{n}</div>
              </div>
            ))}
          </div>
        </Card>

        <Card style={{ padding: '16px 18px' }}>
          <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 3 }}>แจ้งเตือนที่ต้องดำเนินการ</div>
          <div style={{ fontSize: 11.5, color: 'oklch(0.56 0.02 265)', marginBottom: 14 }}>เรียงตามความเร่งด่วน</div>
          <DataState loading={alerts.loading} error={alerts.error} count={sortedAlerts.length} style={{ padding: 0 }} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
            {sortedAlerts.map((a) => {
              const t = tone(asTone(a.severity));
              return (
                <div key={a.id} style={{ display: 'flex', gap: 10, padding: '10px 11px', borderRadius: 8, background: t.bg, border: `1px solid ${t.bd}` }}>
                  <div style={{ width: 3, borderRadius: 2, background: t.accent, flex: '0 0 3px' }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12.5, fontWeight: 500, marginBottom: 2 }}>{a.title}</div>
                    <div style={{ fontSize: 11.5, color: 'oklch(0.48 0.02 265)' }}>{a.detail}</div>
                  </div>
                  <div style={{ fontFamily: MONO, fontSize: 10.5, color: 'oklch(0.55 0.02 265)', whiteSpace: 'nowrap' }}>{alertTime(a.created_at, now)}</div>
                </div>
              );
            })}
          </div>
        </Card>
      </div>

      <Card style={{ overflowX: 'auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 18px', borderBottom: `1px solid ${L.headBd}` }}>
          <CardTitle title="Permit ที่กำลังใช้งาน" sub={`อัปเดต ${now.toLocaleString('th-TH', { dateStyle: 'medium', timeStyle: 'short' })}`} style={{ flex: 1 }} />
          {DASH_FILTERS.map((label, i) => {
            const on = i === 0;
            return (
              <div key={label} style={{ padding: '5px 11px', borderRadius: 20, fontSize: 11.5, cursor: 'pointer', border: `1px solid ${on ? C.ink : C.gryBd}`, background: on ? C.ink : '#fff', color: on ? '#fff' : C.gryFg }}>
                {label}
              </div>
            );
          })}
        </div>
        <TableHead columns={COLS} minWidth={900} labels={['เลขที่', 'ประเภทงาน', 'ผู้รับเหมา', 'พื้นที่', 'ความเสี่ยง', 'วันที่สร้าง', 'สถานะ']} />
        <DataState loading={permits.loading} error={permits.error} count={permits.data.length} />
        {permits.data.map((r) => {
          const [statusLabel, statusTone] = permitStatus(r.status);
          return (
            <TableRow key={r.id} columns={COLS} minWidth={900} style={{ cursor: 'pointer' }}>
              <div style={{ fontFamily: MONO, fontSize: 11.5, color: 'oklch(0.45 0.1 265)', fontWeight: 500 }}>{r.permit_no}</div>
              <div style={{ fontSize: 12.5, ...ellipsis }}>{r.type}</div>
              <div style={{ fontSize: 12.5, color: 'oklch(0.42 0.02 265)', ...ellipsis }}>{r.contractors?.name ?? '—'}</div>
              <div style={{ fontSize: 12.5, color: 'oklch(0.5 0.02 265)', ...ellipsis }}>{r.area}</div>
              <div><Pill t={riskTone(r.risk)}>{r.risk}</Pill></div>
              <div style={{ fontFamily: MONO, fontSize: 11.5, color: 'oklch(0.5 0.02 265)' }}>{new Date(r.created_at).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: '2-digit' })}</div>
              <div><Pill t={statusTone}>{statusLabel}</Pill></div>
            </TableRow>
          );
        })}
      </Card>
    </div>
  );
}
