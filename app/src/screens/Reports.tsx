import { Bar, Card, StatTile, TableHead, TableRow, ellipsis } from '../components/ui';
import { FINDINGS, MONTH_BARS, RANKING, RECOMMENDATIONS, REPORT_STATS } from '../data';
import { L, MONO, tone } from '../theme';

const RANK_COLS = 'minmax(0, 1fr) 74px 74px 86px';
const PERMIT_COLOR = 'oklch(0.52 0.16 265)';
const INCIDENT_COLOR = 'oklch(0.66 0.16 40)';

export function Reports() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, maxWidth: 1180 }}>
      <div style={{ background: L.navy, borderRadius: 12, padding: '22px 24px', color: '#fff', display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 20, flexWrap: 'wrap' }}>
        <div>
          <div style={{ fontFamily: MONO, fontSize: 10.5, letterSpacing: '0.12em', color: 'oklch(0.76 0.04 265)', marginBottom: 6 }}>MONTHLY SAFETY REPORT</div>
          <div style={{ fontSize: 22, fontWeight: 600, letterSpacing: '-0.01em' }}>รายงานสรุปงานความปลอดภัย ประจำเดือนสิงหาคม 2569</div>
          <div style={{ fontSize: 12.5, color: 'oklch(0.8 0.03 265)', marginTop: 6 }}>จัดทำโดยแผนกความปลอดภัย อาชีวอนามัย และสภาพแวดล้อมในการทำงาน</div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <div className="h-report-btn" style={{ padding: '8px 14px', borderRadius: 7, background: 'oklch(0.32 0.05 265)', fontSize: 12.5, cursor: 'pointer' }}>เลือกเดือน</div>
          <div style={{ padding: '8px 14px', borderRadius: 7, background: '#fff', color: 'oklch(0.25 0.04 265)', fontSize: 12.5, fontWeight: 500, cursor: 'pointer' }}>ส่งออก PDF</div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(168px, 1fr))', gap: 12 }}>
        {REPORT_STATS.map((s) => <StatTile key={s.label} {...s} size={25} />)}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(330px, 1fr))', gap: 16, alignItems: 'start' }}>
        <Card style={{ padding: '16px 18px' }}>
          <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 2 }}>จำนวน Permit และเหตุการณ์ รายเดือน</div>
          <div style={{ fontSize: 11.5, color: 'oklch(0.56 0.02 265)', marginBottom: 18 }}>มี.ค. – ส.ค. 2569</div>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 14, height: 172, paddingBottom: 22, borderBottom: '1px solid oklch(0.92 0.01 265)', position: 'relative' }}>
            {MONTH_BARS.map((m) => (
              <div key={m.label} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, height: '100%', justifyContent: 'flex-end' }}>
                <div style={{ fontFamily: MONO, fontSize: 10.5, color: 'oklch(0.5 0.02 265)' }}>{m.value}</div>
                <div style={{ width: '100%', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', gap: 3, height: m.h }}>
                  <div style={{ flex: 1, maxWidth: 26, height: '100%', background: PERMIT_COLOR, borderRadius: '4px 4px 0 0' }} />
                  <div style={{ flex: '0 0 8px', height: m.incH, background: INCIDENT_COLOR, borderRadius: '3px 3px 0 0' }} />
                </div>
                <div style={{ fontSize: 11, color: 'oklch(0.5 0.02 265)', position: 'absolute', bottom: 0 }}>{m.label}</div>
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 18, marginTop: 12 }}>
            <Legend color={PERMIT_COLOR} label="Permit ที่ออก" />
            <Legend color={INCIDENT_COLOR} label="เหตุการณ์ / ข้อบกพร่อง" />
          </div>
        </Card>

        <Card style={{ padding: '16px 18px' }}>
          <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 14 }}>ข้อบกพร่องที่พบบ่อยจากการตรวจพื้นที่</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {FINDINGS.map((f) => (
              <div key={f.label}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 5 }}>
                  <div style={{ fontSize: 12.5 }}>{f.label}</div>
                  <div style={{ fontFamily: MONO, fontSize: 11.5, color: 'oklch(0.45 0.02 265)' }}>{f.value}</div>
                </div>
                <Bar pct={f.pct} color={f.color} height={7} radius={4} />
              </div>
            ))}
          </div>
        </Card>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(330px, 1fr))', gap: 16, alignItems: 'start' }}>
        <Card style={{ overflowX: 'auto' }}>
          <div style={{ padding: '13px 18px', borderBottom: `1px solid ${L.headBd}`, fontSize: 14, fontWeight: 600 }}>ผลการปฏิบัติของผู้รับเหมา 5 อันดับ</div>
          <TableHead columns={RANK_COLS} minWidth={460} gap={10} labels={['ผู้รับเหมา', 'Permit', 'ข้อบกพร่อง', 'คะแนน']} />
          {RANKING.map((r) => {
            const t = tone(r.tone);
            return (
              <TableRow key={r.name} columns={RANK_COLS} minWidth={460} gap={10} hover={false}>
                <div style={{ fontSize: 12.5, ...ellipsis }}>{r.name}</div>
                <div style={{ fontFamily: MONO, fontSize: 12, color: 'oklch(0.45 0.02 265)' }}>{r.permits}</div>
                <div style={{ fontFamily: MONO, fontSize: 12, color: 'oklch(0.45 0.02 265)' }}>{r.findings}</div>
                <div>
                  <span style={{ fontFamily: MONO, fontSize: 11.5, fontWeight: 500, padding: '2px 8px', borderRadius: 4, background: t.bg, color: t.fg }}>{r.score}</span>
                </div>
              </TableRow>
            );
          })}
        </Card>

        <Card style={{ padding: '16px 18px' }}>
          <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 12 }}>ข้อเสนอต่อผู้บริหาร</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 11 }}>
            {RECOMMENDATIONS.map((r, i) => {
              const t = tone(r.tone);
              return (
                <div key={r.title} style={{ display: 'flex', gap: 11, paddingBottom: 11, borderBottom: '1px solid oklch(0.96 0.008 265)' }}>
                  <div style={{ fontFamily: MONO, fontSize: 11, fontWeight: 600, color: 'oklch(0.5 0.12 265)', flex: '0 0 18px', paddingTop: 1 }}>{String(i + 1).padStart(2, '0')}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12.5, fontWeight: 500, marginBottom: 3 }}>{r.title}</div>
                    <div style={{ fontSize: 11.5, color: 'oklch(0.48 0.02 265)', lineHeight: 1.55 }}>{r.detail}</div>
                  </div>
                  <div style={{ fontSize: 10.5, fontWeight: 500, padding: '2px 8px', borderRadius: 4, height: 'fit-content', background: t.bg, color: t.fg, whiteSpace: 'nowrap' }}>{r.priority}</div>
                </div>
              );
            })}
          </div>
        </Card>
      </div>
    </div>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 11.5, color: 'oklch(0.48 0.02 265)' }}>
      <div style={{ width: 10, height: 10, borderRadius: 3, background: color }} /> {label}
    </div>
  );
}
