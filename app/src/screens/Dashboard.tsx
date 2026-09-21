import { useState } from 'react';
import { Button, FormMessage } from '../components/form';
import { PermitDetail } from '../components/PermitDetail';
import { Bar, Card, CardTitle, DataState, Pill, StatTile, TableHead, TableRow, ellipsis } from '../components/ui';
import { useProfile } from '../hooks/useAuth';
import { notifyDataChanged, useAlerts, useContractors, useFindings, usePermits } from '../hooks/useData';
import { countBy, pct, sameMonth } from '../lib/stats';
import { APPROVER_ROLES, ROLE_LABEL, asTone, permitStatus, riskTone, supabase, type Permit, type Role } from '../lib/supabase';
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

const FILTERS = [['all', 'ทั้งหมด'], ['high', 'ความเสี่ยงสูง'], ['expiring', 'ใกล้หมดอายุ']] as const;
type Filter = (typeof FILTERS)[number][0];

const LIVE_STATUSES = ['approved', 'active', 'suspended'];
const DAY_MS = 24 * 60 * 60 * 1000;

/** Approved or running permits that end within 24 hours, or have already passed their end time. */
const expiresSoon = (p: Permit, nowMs: number) => LIVE_STATUSES.includes(p.status) && !!p.end_at && new Date(p.end_at).getTime() - nowMs < DAY_MS;

export function Dashboard({ query }: { query: string }) {
  const permits = usePermits();
  const contractors = useContractors();
  const findings = useFindings();
  const alerts = useAlerts();
  const profile = useProfile();
  const now = new Date();
  const waitingForMe = permits.data.filter((p) => p.permit_next_step === profile.role);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = permits.data.find((p) => p.id === selectedId);
  const sortedPermits = [...permits.data].sort((a, b) => b.created_at.localeCompare(a.created_at));
  const [filter, setFilter] = useState<Filter>('all');
  const nowMs = now.getTime();
  const q = query.trim().toLowerCase();
  const matchesQuery = (p: Permit) => !q || [p.permit_no, p.type, p.area, p.contractors?.name ?? ''].some((s) => s.toLowerCase().includes(q));
  const inFilter: Record<Filter, (p: Permit) => boolean> = {
    all: () => true,
    high: (p) => p.risk === 'สูง',
    expiring: (p) => expiresSoon(p, nowMs),
  };
  const searched = sortedPermits.filter(matchesQuery);
  const visiblePermits = searched.filter(inFilter[filter]);

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

      {APPROVER_ROLES.includes(profile.role) && (
        <ApprovalQueue permits={waitingForMe} loading={permits.loading} error={permits.error} role={profile.role} />
      )}

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
          <CardTitle
            title="Permit ทั้งหมด"
            sub={q ? `ผลการค้นหา "${query.trim()}" — ${visiblePermits.length} รายการ` : 'คลิกรายการเพื่อดูรายละเอียด เอกสารแนบ ประวัติ และเปลี่ยนสถานะงาน'}
            style={{ flex: 1 }}
          />
          {FILTERS.map(([value, label]) => {
            const on = filter === value;
            return (
              <div
                key={value}
                role="button"
                tabIndex={0}
                aria-pressed={on}
                onClick={() => setFilter(value)}
                onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && setFilter(value)}
                style={{ padding: '5px 11px', borderRadius: 20, fontSize: 11.5, cursor: 'pointer', whiteSpace: 'nowrap', border: `1px solid ${on ? C.ink : C.gryBd}`, background: on ? C.ink : '#fff', color: on ? '#fff' : C.gryFg }}
              >
                {label} ({searched.filter(inFilter[value]).length})
              </div>
            );
          })}
        </div>
        <TableHead columns={COLS} minWidth={900} labels={['เลขที่', 'ประเภทงาน', 'ผู้รับเหมา', 'พื้นที่', 'ความเสี่ยง', 'วันที่สร้าง', 'สถานะ']} />
        <DataState
          loading={permits.loading}
          error={permits.error}
          count={visiblePermits.length}
          empty={permits.data.length ? 'ไม่พบ Permit ที่ตรงกับเงื่อนไข' : 'ยังไม่มีข้อมูล'}
        />
        {visiblePermits.map((r) => {
          const [statusLabel, statusTone] = permitStatus(r.status);
          const on = r.id === selectedId;
          return (
            <TableRow
              key={r.id}
              columns={COLS}
              minWidth={900}
              onClick={() => setSelectedId(on ? null : r.id)}
              style={{ cursor: 'pointer', background: on ? 'oklch(0.97 0.018 265)' : undefined, borderLeft: `3px solid ${on ? C.acc : 'transparent'}` }}
            >
              <div style={{ fontFamily: MONO, fontSize: 11.5, color: 'oklch(0.45 0.1 265)', fontWeight: 500 }}>{r.permit_no}</div>
              <div style={{ fontSize: 12.5, ...ellipsis }}>{r.type}</div>
              <div style={{ fontSize: 12.5, color: 'oklch(0.42 0.02 265)', ...ellipsis }}>{r.contractors?.name ?? '—'}</div>
              <div style={{ fontSize: 12.5, color: 'oklch(0.5 0.02 265)', ...ellipsis }}>{r.area}</div>
              <div><Pill t={riskTone(r.risk)}>{r.risk}</Pill></div>
              <div style={{ fontFamily: MONO, fontSize: 11.5, color: 'oklch(0.5 0.02 265)' }}>{new Date(r.created_at).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: '2-digit' })}</div>
              <div>
                <Pill t={statusTone}>{statusLabel}</Pill>
                {expiresSoon(r, nowMs) && r.end_at && (
                  <div style={{ fontFamily: MONO, fontSize: 10, marginTop: 3, color: tone(new Date(r.end_at).getTime() < nowMs ? 'bad' : 'warn').fg }}>
                    {new Date(r.end_at).getTime() < nowMs ? 'เลยเวลา' : 'หมด'} {new Date(r.end_at).toLocaleString('th-TH', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                  </div>
                )}
              </div>
            </TableRow>
          );
        })}
      </Card>

      {selected && <PermitDetail permit={selected} onClose={() => setSelectedId(null)} />}
    </div>
  );
}

const QUEUE_COLS = '118px minmax(0, 1.2fr) minmax(0, 1fr) minmax(0, 0.9fr) 84px 190px';

function ApprovalQueue({ permits, loading, error, role }: { permits: Permit[]; loading: boolean; error: string | null; role: Role }) {
  const [busyId, setBusyId] = useState<string | null>(null);
  const [message, setMessage] = useState<{ error: boolean; text: string } | null>(null);

  async function decide(permit: Permit, decision: 'approved' | 'rejected') {
    if (!supabase) return;
    if (decision === 'rejected' && !window.confirm(`ยืนยันไม่อนุมัติ ${permit.permit_no}?`)) return;
    setBusyId(permit.id);
    setMessage(null);
    const { error: err } = await supabase.rpc('decide_permit', { p_permit_id: permit.id, p_decision: decision });
    setBusyId(null);
    if (err) {
      setMessage({ error: true, text: `ดำเนินการไม่สำเร็จ: ${err.message}` });
      return;
    }
    setMessage({ error: false, text: `${decision === 'approved' ? 'อนุมัติ' : 'ไม่อนุมัติ'} ${permit.permit_no} แล้ว` });
    notifyDataChanged();
  }

  return (
    <Card style={{ overflowX: 'auto' }}>
      <div style={{ padding: '14px 18px', borderBottom: `1px solid ${L.headBd}` }}>
        <CardTitle title={`รออนุมัติจากคุณ (${permits.length})`} sub={`ขั้นตอนของ${ROLE_LABEL[role]}`} />
      </div>
      <TableHead columns={QUEUE_COLS} minWidth={880} labels={['เลขที่', 'ประเภทงาน', 'ผู้รับเหมา', 'พื้นที่', 'ความเสี่ยง', 'การพิจารณา']} />
      <DataState loading={loading} error={error} count={permits.length} empty="ไม่มี Permit ที่รอคุณอนุมัติ" />
      {permits.map((p) => (
        <TableRow key={p.id} columns={QUEUE_COLS} minWidth={880} hover={false}>
          <div style={{ fontFamily: MONO, fontSize: 11.5, color: 'oklch(0.45 0.1 265)', fontWeight: 500 }}>{p.permit_no}</div>
          <div style={{ fontSize: 12.5, ...ellipsis }}>{p.type}</div>
          <div style={{ fontSize: 12.5, color: 'oklch(0.42 0.02 265)', ...ellipsis }}>{p.contractors?.name ?? '—'}</div>
          <div style={{ fontSize: 12.5, color: 'oklch(0.5 0.02 265)', ...ellipsis }}>{p.area}</div>
          <div><Pill t={riskTone(p.risk)}>{p.risk}</Pill></div>
          <div style={{ display: 'flex', gap: 6 }}>
            <Button variant="outline" disabled={busyId !== null} onClick={() => decide(p, 'rejected')}>ไม่อนุมัติ</Button>
            <Button disabled={busyId !== null} onClick={() => decide(p, 'approved')}>{busyId === p.id ? 'กำลังบันทึก...' : 'อนุมัติ'}</Button>
          </div>
        </TableRow>
      ))}
      {message && <FormMessage error={message.error} style={{ padding: '12px 18px' }}>{message.text}</FormMessage>}
    </Card>
  );
}
