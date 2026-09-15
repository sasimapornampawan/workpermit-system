import { Bar, Card, CardTitle, Pill, StatTile, TableHead, TableRow, ellipsis } from '../components/ui';
import { ALERTS, DASH_FILTERS, KPIS, TYPE_BARS } from '../data';
import { dataStateMessage, usePermits } from '../hooks/useData';
import { permitStatus, riskTone } from '../lib/supabase';
import { C, L, MONO, tone } from '../theme';

const COLS = '118px minmax(0, 1.1fr) minmax(0, 1fr) minmax(0, 0.9fr) 96px 104px 92px';

export function Dashboard() {
  const { data: permits, loading, error } = usePermits();
  const message = dataStateMessage(loading, error, permits.length);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
        {KPIS.map((k) => <StatTile key={k.label} {...k} />)}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(330px, 1fr))', gap: 16 }}>
        <Card style={{ padding: '16px 18px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <CardTitle title="Permit ที่ออกในเดือนนี้ แยกตามประเภทงาน" sub="กันยายน 2569 — รวม 268 ใบ" />
            <div style={{ fontFamily: MONO, fontSize: 11, color: 'oklch(0.56 0.02 265)' }}>MTD</div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 11 }}>
            {TYPE_BARS.map((b) => (
              <div key={b.label} style={{ display: 'grid', gridTemplateColumns: '150px minmax(0, 1fr) 54px', alignItems: 'center', gap: 12 }}>
                <div style={{ fontSize: 12.5, ...ellipsis }}>{b.label}</div>
                <Bar pct={b.pct} color={b.color} height={10} radius={5} />
                <div style={{ fontFamily: MONO, fontSize: 12, textAlign: 'right', color: 'oklch(0.4 0.02 265)' }}>{b.value}</div>
              </div>
            ))}
          </div>
        </Card>

        <Card style={{ padding: '16px 18px' }}>
          <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 3 }}>แจ้งเตือนที่ต้องดำเนินการ</div>
          <div style={{ fontSize: 11.5, color: 'oklch(0.56 0.02 265)', marginBottom: 14 }}>เรียงตามความเร่งด่วน</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
            {ALERTS.map((a) => {
              const t = tone(a.tone);
              return (
                <div key={a.title} style={{ display: 'flex', gap: 10, padding: '10px 11px', borderRadius: 8, background: t.bg, border: `1px solid ${t.bd}` }}>
                  <div style={{ width: 3, borderRadius: 2, background: t.accent, flex: '0 0 3px' }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12.5, fontWeight: 500, marginBottom: 2 }}>{a.title}</div>
                    <div style={{ fontSize: 11.5, color: 'oklch(0.48 0.02 265)' }}>{a.detail}</div>
                  </div>
                  <div style={{ fontFamily: MONO, fontSize: 10.5, color: 'oklch(0.55 0.02 265)', whiteSpace: 'nowrap' }}>{a.time}</div>
                </div>
              );
            })}
          </div>
        </Card>
      </div>

      <Card style={{ overflowX: 'auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 18px', borderBottom: `1px solid ${L.headBd}` }}>
          <CardTitle title="Permit ที่กำลังใช้งาน" sub="อัปเดต 14 ก.ย. 2569 เวลา 09:42" style={{ flex: 1 }} />
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
        {message && <div style={{ padding: '16px 18px', fontSize: 12.5, color: error ? tone('bad').fg : 'oklch(0.5 0.02 265)' }}>{message}</div>}
        {permits.map((r) => {
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
