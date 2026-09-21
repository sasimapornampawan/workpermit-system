import { useEffect, useState } from 'react';
import { Pill } from '../components/ui';
import { asTone, badgeStatus, supabase } from '../lib/supabase';
import { C, MONO, tone } from '../theme';
import { Shell } from './Login';

type Verified = {
  name: string; company: string; card_no: string | null; tier: string | null; kind: string | null; role: string | null;
  expiry: string | null; status: string; training: string; training_status: string; perms: string[]; contractor_status: string | null;
};

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Public page opened by scanning a badge QR code; needs no login. */
export function VerifyBadge({ token }: { token: string }) {
  const [badge, setBadge] = useState<Verified | null | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);
  const [checkedAt] = useState(() => new Date());

  useEffect(() => {
    if (!supabase || !UUID.test(token)) {
      setBadge(null);
      return;
    }
    supabase.rpc('verify_badge', { p_token: token }).then(({ data, error: err }) => {
      if (err) setError(err.message);
      setBadge((data as Verified | null) ?? null);
    });
  }, [token]);

  if (badge === undefined) return <Shell><div style={{ fontSize: 13, color: C.mut }}>กำลังตรวจสอบบัตร...</div></Shell>;

  if (!badge) {
    return (
      <Shell>
        <Banner valid={false} title="ไม่พบบัตรนี้ในระบบ" detail={error ? `ตรวจสอบไม่สำเร็จ: ${error}` : 'QR อาจไม่ถูกต้อง หรือบัตรถูกยกเลิกแล้ว ห้ามเข้าพื้นที่'} />
      </Shell>
    );
  }

  const reason =
    badge.contractor_status === 'bad' ? 'บริษัทผู้รับเหมาถูกระงับการทำงาน'
      : badge.status !== 'issued' ? `บัตรยังไม่พร้อมใช้งาน (${badgeStatus(badge.status)[0]})`
        : badge.training_status === 'bad' ? 'ผลการอบรมหมดอายุหรือไม่ผ่าน'
          : null;

  const rows: [string, string][] = [
    ['บริษัท', badge.company],
    ['เลขที่บัตร', badge.card_no ?? '—'],
    ['ตำแหน่ง', badge.role ?? '—'],
    ['ประเภท / ระดับ', [badge.kind, badge.tier].filter(Boolean).join(' · ') || '—'],
    ['หมดอายุ', badge.expiry ?? '—'],
  ];

  return (
    <Shell>
      <Banner valid={!reason} title={reason ? 'ห้ามเข้าพื้นที่' : 'บัตรใช้งานได้'} detail={reason ?? 'ตรวจสอบกับรูปถ่ายบนบัตรก่อนอนุญาตให้เข้าพื้นที่'} />
      <div style={{ fontSize: 17, fontWeight: 600, margin: '16px 0 10px' }}>{badge.name}</div>
      <div style={{ display: 'grid', gridTemplateColumns: '110px minmax(0, 1fr)', gap: '7px 10px', fontSize: 12.5 }}>
        {rows.map(([label, value]) => (
          <div key={label} style={{ display: 'contents' }}>
            <div style={{ color: C.mut }}>{label}</div>
            <div style={{ fontFamily: label === 'เลขที่บัตร' ? MONO : undefined }}>{value}</div>
          </div>
        ))}
        <div style={{ color: C.mut }}>ผลอบรม</div>
        <div><Pill t={asTone(badge.training_status)}>{badge.training}</Pill></div>
      </div>
      {badge.perms.length > 0 && (
        <div style={{ marginTop: 12 }}>
          <div style={{ fontSize: 11.5, color: C.mut, marginBottom: 6 }}>สิทธิ์การเข้าทำงาน</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
            {badge.perms.map((p) => (
              <div key={p} style={{ fontSize: 11.5, padding: '3px 8px', borderRadius: 4, background: 'oklch(0.955 0.02 265)', border: '1px solid oklch(0.9 0.02 265)' }}>{p}</div>
            ))}
          </div>
        </div>
      )}
      <div style={{ fontFamily: MONO, fontSize: 10.5, color: C.mut, marginTop: 16 }}>
        ตรวจสอบเมื่อ {checkedAt.toLocaleString('th-TH', { dateStyle: 'medium', timeStyle: 'short' })}
      </div>
    </Shell>
  );
}

function Banner({ valid, title, detail }: { valid: boolean; title: string; detail: string }) {
  const t = tone(valid ? 'ok' : 'bad');
  return (
    <div role="status" style={{ padding: '14px 16px', borderRadius: 10, background: t.bg, border: `2px solid ${t.accent}` }}>
      <div style={{ fontSize: 18, fontWeight: 700, color: t.fg }}>{valid ? '✓ ' : '✕ '}{title}</div>
      <div style={{ fontSize: 12.5, color: t.fg, marginTop: 3 }}>{detail}</div>
    </div>
  );
}
