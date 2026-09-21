import { useState } from 'react';
import { createPortal } from 'react-dom';
import { BRAND } from '../brand';
import { BadgeForm } from '../components/BadgeForm';
import { BrandMark } from '../components/BrandMark';
import { Button, FormMessage } from '../components/form';
import { Card, CardTitle, CheckItem, DataState, Pill, TableHead, TableRow, ellipsis } from '../components/ui';
import { BADGE_CHECKS } from '../data';
import { useProfile } from '../hooks/useAuth';
import { notifyDataChanged, useBadges, useContractors } from '../hooks/useData';
import { asTone, badgeStatus, supabase, type Badge } from '../lib/supabase';
import { C, L, MONO, tone } from '../theme';

const COLS = 'minmax(0, 1.4fr) minmax(0, 1.2fr) 108px 120px 96px';

export function Badges({ selected, onSelect }: { selected: number; onSelect: (i: number) => void }) {
  const profile = useProfile();
  const { data, loading, error } = useBadges();
  const contractors = useContractors();
  const [editing, setEditing] = useState<Badge | 'new' | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ error: boolean; text: string } | null>(null);

  const queue = [...data].sort((a, b) => a.created_at.localeCompare(b.created_at));
  const current = queue.length ? queue[Math.min(selected, queue.length - 1)] : null;
  const pending = queue.filter((b) => b.status !== 'issued').length;
  const isSafety = profile.role === 'safety';
  const canRequest = isSafety || profile.role === 'contractor';

  function select(i: number) {
    setMessage(null);
    onSelect(i);
  }

  async function issue(badge: Badge) {
    if (!supabase) return;
    setBusy(true);
    setMessage(null);
    const { data: rows, error: err } = await supabase
      .from('badges')
      .update({ status: 'issued', issued_at: new Date().toISOString(), issued_by: profile.id })
      .eq('id', badge.id)
      .select('id');
    setBusy(false);
    if (err || !rows?.length) {
      setMessage({ error: true, text: `ออกบัตรไม่สำเร็จ: ${err?.message ?? 'ไม่มีสิทธิ์แก้ไขรายการนี้'}` });
      return;
    }
    setMessage({ error: false, text: `ออกบัตร ${badge.card_no} ให้ ${badge.name} แล้ว` });
    notifyDataChanged();
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 16, alignItems: 'start' }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {editing && (
          <BadgeForm
            key={editing === 'new' ? 'new' : editing.id}
            badge={editing === 'new' ? null : editing}
            contractors={contractors.data}
            onClose={() => setEditing(null)}
          />
        )}
        <Card style={{ overflowX: 'auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '13px 18px', borderBottom: `1px solid ${L.headBd}` }}>
            <CardTitle title="คำขอออกบัตรผู้รับเหมา" sub="เลือกรายการเพื่อดูตัวอย่างบัตรและออกบัตร" style={{ flex: 1 }} />
            <div style={{ fontFamily: MONO, fontSize: 11, padding: '3px 9px', borderRadius: 20, background: 'oklch(0.96 0.03 70)', color: 'oklch(0.45 0.12 70)', border: '1px solid oklch(0.88 0.06 70)', whiteSpace: 'nowrap' }}>รอดำเนินการ {pending}</div>
            {canRequest && (
              <Button disabled={editing === 'new'} onClick={() => setEditing('new')} style={{ padding: '6px 12px', fontSize: 12 }}>+ เพิ่มคำขอบัตร</Button>
            )}
          </div>
          <TableHead columns={COLS} minWidth={720} labels={['ผู้ปฏิบัติงาน', 'บริษัท', 'อบรมผ่าน', 'ประเภทบัตร', 'สถานะ']} />
          <DataState loading={loading} error={error} count={queue.length} />
          {queue.map((b, i) => {
            const on = b === current;
            const [statusLabel, statusTone] = badgeStatus(b.status);
            return (
              <TableRow
                key={b.id}
                columns={COLS}
                minWidth={720}
                className="h-badge-row"
                onClick={() => select(i)}
                style={{ cursor: 'pointer', background: on ? 'oklch(0.97 0.018 265)' : '#fff', borderLeft: `3px solid ${on ? C.acc : 'transparent'}` }}
              >
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 12.5, fontWeight: 500, ...ellipsis }}>{b.name}</div>
                  <div style={{ fontFamily: MONO, fontSize: 10.5, color: 'oklch(0.58 0.02 265)' }}>{b.id_no}</div>
                </div>
                <div style={{ fontSize: 12, color: 'oklch(0.45 0.02 265)', ...ellipsis }}>{b.company}</div>
                <div><Pill t={asTone(b.training_status)}>{b.training}</Pill></div>
                <div style={{ fontSize: 12, color: 'oklch(0.45 0.02 265)' }}>{b.kind}</div>
                <div><Pill t={statusTone}>{statusLabel}</Pill></div>
              </TableRow>
            );
          })}
        </Card>

        <Card style={{ padding: '16px 18px' }}>
          <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 12 }}>เงื่อนไขการออกบัตร</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 10 }}>
            {BADGE_CHECKS.map((c) => <CheckItem key={c.label} {...c} />)}
          </div>
        </Card>
      </div>

      {/* Print copy lives outside #root so the print stylesheet can hide the whole app and show only the card. */}
      {current && createPortal(<div className="print-only"><BadgePreview badge={current} /></div>, document.body)}

      {current && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, position: 'sticky', top: 88 }}>
          <BadgePreview badge={current} />
          {isSafety && (
            <div style={{ display: 'flex', gap: 8 }}>
              <Button disabled={busy || current.status !== 'ready'} onClick={() => issue(current)} style={{ flex: 1, padding: 9 }}>
                {busy ? 'กำลังบันทึก...' : current.status === 'issued' ? 'ออกบัตรแล้ว' : 'ออกบัตร'}
              </Button>
              <Button variant="outline" onClick={() => setEditing(current)} style={{ padding: '9px 14px' }}>แก้ไข</Button>
              <Button variant="outline" onClick={() => window.print()} style={{ padding: '9px 14px' }}>พิมพ์</Button>
            </div>
          )}
          {message ? (
            <FormMessage error={message.error} style={{ textAlign: 'center' }}>{message.text}</FormMessage>
          ) : (
            <div style={{ fontSize: 11, color: 'oklch(0.55 0.02 265)', textAlign: 'center' }}>
              {isSafety && !['ready', 'issued'].includes(current.status) ? 'ออกบัตรได้เมื่อสถานะเป็น "พร้อมออกบัตร"' : 'บัตรมีอายุ 1 ปี และผูกกับผลการอบรมล่าสุด'}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function BadgePreview({ badge }: { badge: Badge }) {
  const tier = tone(badge.tier?.includes('ควบคุม') ? 'info' : 'flat');
  return (
    <div style={{ borderRadius: 12, overflow: 'hidden', border: '1px solid oklch(0.88 0.01 265)', background: '#fff', boxShadow: '0 8px 24px -12px oklch(0.3 0.05 265 / 0.28)' }}>
      <div style={{ background: L.navy, padding: '12px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 9, color: '#fff', minWidth: 0 }}>
          <BrandMark height={22} />
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 11.5, fontWeight: 600, letterSpacing: '0.02em' }}>บัตรผู้รับเหมา · {BRAND.shortTh}</div>
            <div style={{ fontSize: 9.5, color: 'oklch(0.74 0.03 265)', fontFamily: MONO, letterSpacing: '0.06em' }}>CONTRACTOR ID CARD · {BRAND.site}</div>
          </div>
        </div>
        <div style={{ padding: '3px 8px', borderRadius: 4, background: tier.bg, color: tier.fg, fontSize: 10, fontWeight: 600 }}>{badge.tier}</div>
      </div>

      <div style={{ padding: 14, display: 'flex', gap: 12 }}>
        <div style={{ width: 82, height: 100, flex: '0 0 82px', borderRadius: 6, border: '1px solid oklch(0.88 0.01 265)', background: 'repeating-linear-gradient(135deg, oklch(0.95 0.01 265) 0 6px, oklch(0.91 0.012 265) 6px 12px)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', paddingBottom: 6 }}>
          <div style={{ fontFamily: MONO, fontSize: 8, color: 'oklch(0.45 0.02 265)', letterSpacing: '0.04em' }}>PHOTO</div>
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 15, fontWeight: 600, letterSpacing: '-0.01em' }}>{badge.name}</div>
          <div style={{ fontSize: 11.5, color: 'oklch(0.5 0.02 265)', marginBottom: 8 }}>{badge.role}</div>
          <div style={{ fontSize: 11, color: 'oklch(0.45 0.02 265)', lineHeight: 1.65 }}>
            <div>บริษัท: {badge.company}</div>
            <div>เลขบัตร: <span style={{ fontFamily: MONO }}>{badge.card_no}</span></div>
            <div>หมดอายุ: <span style={{ fontFamily: MONO }}>{badge.expiry}</span></div>
          </div>
        </div>
      </div>

      <div style={{ padding: '0 14px 12px' }}>
        <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.08em', color: 'oklch(0.55 0.02 265)', marginBottom: 6 }}>สิทธิ์การเข้าทำงาน</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
          {badge.perms.map((p) => (
            <div key={p} style={{ fontSize: 10.5, padding: '3px 8px', borderRadius: 4, background: 'oklch(0.955 0.02 265)', border: '1px solid oklch(0.9 0.02 265)', color: 'oklch(0.36 0.06 265)' }}>{p}</div>
          ))}
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', borderTop: '1px dashed oklch(0.88 0.01 265)', background: 'oklch(0.985 0.004 265)' }}>
        <div style={{ width: 52, height: 52, flex: '0 0 52px', background: 'repeating-conic-gradient(oklch(0.25 0.03 265) 0% 25%, #fff 0% 50%) 0 0 / 9px 9px', borderRadius: 3 }} />
        <div style={{ fontSize: 10.5, color: 'oklch(0.5 0.02 265)', lineHeight: 1.5 }}>สแกนเพื่อตรวจสอบสถานะบัตรและ<br />ประวัติการอบรมที่จุดคัดกรอง</div>
      </div>
    </div>
  );
}
