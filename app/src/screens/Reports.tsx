import { Bar, Card, DataState, StatTile, TableHead, TableRow, ellipsis } from '../components/ui';
import { useContractors, useFindings, useMonthlyReports, usePermits, useRecommendations } from '../hooks/useData';
import { countBy, localDate, pct, sameMonth } from '../lib/stats';
import { priorityLabel } from '../lib/supabase';
import { L, MONO, tone, type Tone } from '../theme';

const RANK_COLS = 'minmax(0, 1fr) 74px 74px 86px';
const PERMIT_COLOR = 'oklch(0.52 0.16 265)';
const INCIDENT_COLOR = 'oklch(0.66 0.16 40)';
const FINDING_COLORS = ['oklch(0.6 0.16 40)', 'oklch(0.66 0.15 50)', 'oklch(0.72 0.14 62)', 'oklch(0.76 0.12 72)', 'oklch(0.8 0.1 82)'];

const scoreTone = (score: number): Tone => (score >= 85 ? 'ok' : score >= 70 ? 'warn' : 'bad');

export function Reports() {
  const permits = usePermits();
  const contractors = useContractors();
  const findings = useFindings();
  const monthly = useMonthlyReports();
  const recommendations = useRecommendations();
  const now = new Date();

  const months = Array.from({ length: 6 }, (_, i) => new Date(now.getFullYear(), now.getMonth() - 5 + i, 1));
  const bars = months.map((m) => ({
    label: m.toLocaleDateString('th-TH', { month: 'short' }),
    permits: permits.data.filter((p) => sameMonth(new Date(p.created_at), m)).length,
    findings: findings.data.filter((f) => sameMonth(localDate(f.found_on), m)).length,
  }));
  const maxBar = Math.max(...bars.flatMap((b) => [b.permits, b.findings]));

  const latest = [...monthly.data].sort((a, b) => b.month.localeCompare(a.month))[0];
  const latestNote = latest
    ? `ข้อมูลเดือน ${localDate(latest.month).toLocaleDateString('th-TH', { month: 'short', year: 'numeric' })}`
    : 'ยังไม่มีข้อมูลรายเดือน';
  const stats = [
    { label: 'Permit ที่ออกเดือนนี้', value: String(bars[5].permits), note: `6 เดือนล่าสุด ${bars.reduce((n, b) => n + b.permits, 0)} ใบ` },
    { label: 'ชั่วโมงทำงานปลอดอุบัติเหตุ', value: latest ? latest.safe_hours.toLocaleString('en-US') : '—', note: latestNote },
    { label: 'เหตุการณ์เกือบเกิดอุบัติเหตุ', value: latest ? String(latest.near_misses) : '—', note: latestNote },
    { label: 'อัตราการปิดงานตรงเวลา', value: latest ? `${latest.on_time_close_pct}%` : '—', note: latestNote },
    { label: 'ผู้รับเหมาที่ถูกระงับ', value: String(contractors.data.filter((c) => c.status === 'bad').length), note: `จากทั้งหมด ${contractors.data.length} บริษัท` },
  ];

  const topFindings = [...countBy(findings.data, (f) => f.category)].sort((a, b) => b[1] - a[1]).slice(0, 5);
  const maxFinding = Math.max(...topFindings.map(([, n]) => n));

  const permitsByContractor = countBy(permits.data, (p) => p.contractor_id);
  const findingsByContractor = countBy(findings.data, (f) => f.contractor_id);
  const ranking = contractors.data
    .filter((c) => c.safety_score !== null)
    .sort((a, b) => (b.safety_score ?? 0) - (a.safety_score ?? 0))
    .slice(0, 5);

  const sortedRecommendations = [...recommendations.data].sort((a, b) => a.sort - b.sort);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, maxWidth: 1180 }}>
      <div style={{ background: L.navy, borderRadius: 12, padding: '22px 24px', color: '#fff', display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 20, flexWrap: 'wrap' }}>
        <div>
          <div style={{ fontFamily: MONO, fontSize: 10.5, letterSpacing: '0.12em', color: 'oklch(0.76 0.04 265)', marginBottom: 6 }}>MONTHLY SAFETY REPORT</div>
          <div style={{ fontSize: 22, fontWeight: 600, letterSpacing: '-0.01em' }}>รายงานสรุปงานความปลอดภัย ประจำเดือน{now.toLocaleDateString('th-TH', { month: 'long', year: 'numeric' })}</div>
          <div style={{ fontSize: 12.5, color: 'oklch(0.8 0.03 265)', marginTop: 6 }}>จัดทำโดยแผนกความปลอดภัย อาชีวอนามัย และสภาพแวดล้อมในการทำงาน</div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <div className="h-report-btn" style={{ padding: '8px 14px', borderRadius: 7, background: 'oklch(0.32 0.05 265)', fontSize: 12.5, cursor: 'pointer' }}>เลือกเดือน</div>
          <div style={{ padding: '8px 14px', borderRadius: 7, background: '#fff', color: 'oklch(0.25 0.04 265)', fontSize: 12.5, fontWeight: 500, cursor: 'pointer' }}>ส่งออก PDF</div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(168px, 1fr))', gap: 12 }}>
        {stats.map((s) => <StatTile key={s.label} {...s} size={25} />)}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(330px, 1fr))', gap: 16, alignItems: 'start' }}>
        <Card style={{ padding: '16px 18px' }}>
          <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 2 }}>จำนวน Permit และเหตุการณ์ รายเดือน</div>
          <div style={{ fontSize: 11.5, color: 'oklch(0.56 0.02 265)', marginBottom: 18 }}>{bars[0].label} – {bars[5].label} {now.toLocaleDateString('th-TH', { year: 'numeric' })}</div>
          <DataState loading={permits.loading || findings.loading} error={permits.error ?? findings.error} count={maxBar} style={{ padding: '0 0 12px' }} />
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
            <Legend color={INCIDENT_COLOR} label="เหตุการณ์ / ข้อบกพร่อง" />
          </div>
        </Card>

        <Card style={{ padding: '16px 18px' }}>
          <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 14 }}>ข้อบกพร่องที่พบบ่อยจากการตรวจพื้นที่</div>
          <DataState loading={findings.loading} error={findings.error} count={topFindings.length} style={{ padding: 0 }} />
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
          <div style={{ padding: '13px 18px', borderBottom: `1px solid ${L.headBd}`, fontSize: 14, fontWeight: 600 }}>ผลการปฏิบัติของผู้รับเหมา 5 อันดับ</div>
          <TableHead columns={RANK_COLS} minWidth={460} gap={10} labels={['ผู้รับเหมา', 'Permit', 'ข้อบกพร่อง', 'คะแนน']} />
          <DataState loading={contractors.loading} error={contractors.error} count={ranking.length} />
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

        <Card style={{ padding: '16px 18px' }}>
          <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 12 }}>ข้อเสนอต่อผู้บริหาร</div>
          <DataState loading={recommendations.loading} error={recommendations.error} count={sortedRecommendations.length} style={{ padding: 0 }} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 11 }}>
            {sortedRecommendations.map((r, i) => {
              const [label, priorityTone] = priorityLabel(r.priority);
              const t = tone(priorityTone);
              return (
                <div key={r.id} style={{ display: 'flex', gap: 11, paddingBottom: 11, borderBottom: '1px solid oklch(0.96 0.008 265)' }}>
                  <div style={{ fontFamily: MONO, fontSize: 11, fontWeight: 600, color: 'oklch(0.5 0.12 265)', flex: '0 0 18px', paddingTop: 1 }}>{String(i + 1).padStart(2, '0')}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12.5, fontWeight: 500, marginBottom: 3 }}>{r.title}</div>
                    <div style={{ fontSize: 11.5, color: 'oklch(0.48 0.02 265)', lineHeight: 1.55 }}>{r.detail}</div>
                  </div>
                  <div style={{ fontSize: 10.5, fontWeight: 500, padding: '2px 8px', borderRadius: 4, height: 'fit-content', background: t.bg, color: t.fg, whiteSpace: 'nowrap' }}>{label}</div>
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
