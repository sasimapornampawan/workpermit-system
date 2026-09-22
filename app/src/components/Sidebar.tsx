import { useState } from 'react';
import { BRAND } from '../brand';
import { UI_SCALES, applyUiScale, getUiScale } from '../lib/uiScale';
import { NAV, type Screen } from '../data';
import { BrandMark } from './BrandMark';
import { signOut, useProfile } from '../hooks/useAuth';
import { useBadges, useContractors, useFindings, usePermits } from '../hooks/useData';
import { ROLE_LABEL } from '../lib/supabase';
import { L, MONO } from '../theme';

type Props = { screen: Screen; screens: Screen[]; onNavigate: (s: Screen) => void; onChangePassword: () => void; bilingual: boolean };

const footerButton = {
  flex: 1, background: 'transparent', border: '1px solid oklch(0.36 0.05 265)', borderRadius: 6,
  color: 'oklch(0.86 0.02 265)', fontSize: 11, padding: '5px 6px', cursor: 'pointer', whiteSpace: 'nowrap',
} as const;

export function Sidebar({ screen, screens, onNavigate, onChangePassword, bilingual }: Props) {
  const [scale, setScale] = useState(getUiScale);
  const profile = useProfile();
  const contractors = useContractors();
  const badges = useBadges();
  const permits = usePermits();
  const findings = useFindings();
  const counts: Partial<Record<Screen, number>> = {
    findings: findings.data.filter((f) => !f.resolved).length,
    dashboard: permits.data.filter((p) => p.permit_next_step === profile.role).length,
    contractors: contractors.data.length,
    badges: badges.data.filter((b) => b.status !== 'issued').length,
    permits: permits.data.filter((p) => p.status === 'pending').length,
  };
  const initials = profile.full_name.replace(/^(นางสาว|นาง|นาย)\s*/, '').slice(0, 2);

  return (
    <aside style={{ width: 232, flex: '0 0 232px', background: L.navy, color: 'oklch(0.97 0.01 265)', display: 'flex', flexDirection: 'column', position: 'sticky', top: 0, height: 'var(--screen-h)' }}>
      <div style={{ padding: '20px 18px 18px', borderBottom: '1px solid oklch(0.3 0.04 265)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <BrandMark height={26} />
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 13.5, fontWeight: 600, letterSpacing: '0.01em' }}>Safety Work Permit</div>
            <div style={{ fontSize: 11, color: 'oklch(0.78 0.03 265)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{BRAND.shortTh}</div>
            <div style={{ fontSize: 10, color: 'oklch(0.68 0.03 265)' }}>{BRAND.site}</div>
          </div>
        </div>
      </div>

      <nav style={{ padding: '14px 10px', flex: 1, overflowY: 'auto' }}>
        <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.12em', color: 'oklch(0.62 0.03 265)', padding: '0 8px 8px' }}>เมนูหลัก</div>
        {NAV.filter((item) => screens.includes(item.id)).map((item) => {
          const on = item.id === screen;
          const count = counts[item.id];
          return (
            <div
              key={item.id}
              onClick={() => onNavigate(item.id)}
              className="h-nav"
              style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', borderRadius: 7, cursor: 'pointer', marginBottom: 2, background: on ? 'oklch(0.3 0.05 265)' : 'transparent', color: on ? '#fff' : 'oklch(0.86 0.02 265)' }}
            >
              <div style={{ width: 3, height: 15, borderRadius: 2, background: on ? 'oklch(0.68 0.17 265)' : 'transparent' }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 500 }}>{item.label}</div>
                {bilingual && <div style={{ fontSize: 10, color: 'oklch(0.68 0.03 265)', fontFamily: MONO }}>{item.en}</div>}
              </div>
              {!!count && (
                <div style={{ fontFamily: MONO, fontSize: 10.5, padding: '1px 6px', borderRadius: 10, background: 'oklch(0.34 0.05 265)', color: 'oklch(0.88 0.03 265)' }}>{count}</div>
              )}
            </div>
          );
        })}
      </nav>

      <div style={{ padding: 14, borderTop: '1px solid oklch(0.3 0.04 265)', display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ width: 30, height: 30, flex: '0 0 30px', borderRadius: '50%', background: 'oklch(0.35 0.05 265)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 600, color: 'oklch(0.85 0.03 265)' }}>{initials}</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 12, fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{profile.full_name}</div>
          <div style={{ fontSize: 10.5, color: 'oklch(0.7 0.03 265)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{ROLE_LABEL[profile.role]}</div>
        </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <span style={{ fontSize: 10.5, color: 'oklch(0.7 0.03 265)', flex: 1 }}>ขนาดตัวอักษร</span>
          {UI_SCALES.map((s, i) => {
            const on = s.value === scale;
            return (
              <button
                key={s.value}
                type="button"
                title={s.label}
                aria-label={`ขนาดตัวอักษร${s.label}`}
                aria-pressed={on}
                onClick={() => {
                  applyUiScale(s.value, true);
                  setScale(s.value);
                }}
                className={on ? undefined : 'h-nav'}
                style={{ width: 26, height: 24, borderRadius: 5, cursor: 'pointer', fontSize: 10 + i * 2.5, fontWeight: 600, lineHeight: 1, border: `1px solid ${on ? 'oklch(0.68 0.17 265)' : 'oklch(0.36 0.05 265)'}`, background: on ? 'oklch(0.3 0.05 265)' : 'transparent', color: 'oklch(0.92 0.02 265)' }}
              >
                ก
              </button>
            );
          })}
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          <button type="button" onClick={onChangePassword} className="h-nav" style={footerButton}>เปลี่ยนรหัสผ่าน</button>
          <button type="button" onClick={() => signOut()} className="h-nav" style={footerButton}>ออกจากระบบ</button>
        </div>
      </div>
    </aside>
  );
}
