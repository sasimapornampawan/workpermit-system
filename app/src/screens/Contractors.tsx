import { Card, OutlineButton, Pill, PrimaryButton, TableHead, TableRow, ellipsis } from '../components/ui';
import { CONTRACTOR_KPIS } from '../data';
import { dataStateMessage, useContractors } from '../hooks/useData';
import { contractorStatus } from '../lib/supabase';
import { L, MONO, tone } from '../theme';

const COLS = 'minmax(0, 1.5fr) 130px 84px 118px 118px 110px';

export function Contractors() {
  const { data, loading, error } = useContractors();
  const message = dataStateMessage(loading, error, data.length);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 12 }}>
        {CONTRACTOR_KPIS.map((k) => (
          <Card key={k.label} style={{ padding: '13px 15px' }}>
            <div style={{ fontSize: 11.5, color: 'oklch(0.5 0.02 265)', marginBottom: 6 }}>{k.label}</div>
            <div style={{ fontFamily: MONO, fontSize: 24, fontWeight: 500, lineHeight: 1 }}>{k.value}</div>
          </Card>
        ))}
      </div>

      <Card style={{ overflowX: 'auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '13px 18px', borderBottom: `1px solid ${L.headBd}` }}>
          <div style={{ fontSize: 14, fontWeight: 600, flex: 1 }}>ทะเบียนผู้รับเหมา</div>
          <OutlineButton style={{ padding: '6px 12px', borderRadius: 7, fontSize: 12 }}>นำเข้าไฟล์ Excel</OutlineButton>
          <PrimaryButton style={{ padding: '6px 12px', borderRadius: 7, fontSize: 12 }}>+ เพิ่มผู้รับเหมา</PrimaryButton>
        </div>
        <TableHead columns={COLS} minWidth={850} labels={['บริษัทผู้รับเหมา', 'ประเภทงาน', 'พนักงาน', 'ประกันภัย', 'บัตรที่ใช้งาน', 'สถานะ']} />
        {message && <div style={{ padding: '16px 18px', fontSize: 12.5, color: error ? tone('bad').fg : 'oklch(0.5 0.02 265)' }}>{message}</div>}
        {data.map((c) => {
          const [statusLabel, statusTone] = contractorStatus(c.status);
          return (
          <TableRow key={c.id} columns={COLS} minWidth={850}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
              <div style={{ width: 28, height: 28, flex: '0 0 28px', borderRadius: 6, background: 'oklch(0.95 0.03 265)', color: 'oklch(0.42 0.12 265)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10.5, fontWeight: 600 }}>{c.initials}</div>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 12.5, fontWeight: 500, ...ellipsis }}>{c.name}</div>
                <div style={{ fontFamily: MONO, fontSize: 10.5, color: 'oklch(0.58 0.02 265)' }}>{c.code}</div>
              </div>
            </div>
            <div style={{ fontSize: 12, color: 'oklch(0.45 0.02 265)' }}>{c.scope}</div>
            <div style={{ fontFamily: MONO, fontSize: 12.5 }}>{c.workers}</div>
            <div style={{ fontFamily: MONO, fontSize: 11.5, color: 'oklch(0.45 0.02 265)' }}>{c.insurance}</div>
            <div style={{ fontFamily: MONO, fontSize: 11.5, color: 'oklch(0.45 0.02 265)' }}>{c.cards}</div>
            <div><Pill t={statusTone}>{statusLabel}</Pill></div>
          </TableRow>
          );
        })}
      </Card>
    </div>
  );
}
