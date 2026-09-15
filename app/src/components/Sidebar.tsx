import { NAV, type Screen } from '../data';
import { useBadges, useContractors, usePermits } from '../hooks/useData';
import { L, MONO } from '../theme';

export function Sidebar({ screen, onNavigate, bilingual }: { screen: Screen; onNavigate: (s: Screen) => void; bilingual: boolean }) {
  const contractors = useContractors();
  const badges = useBadges();
  const permits = usePermits();
  const counts: Partial<Record<Screen, number>> = {
    contractors: contractors.data.length,
    badges: badges.data.filter((b) => b.status !== 'ready').length,
    permits: permits.data.filter((p) => p.status === 'pending').length,
  };

  return (
    <aside style={{ width: 232, flex: '0 0 232px', background: L.navy, color: 'oklch(0.97 0.01 265)', display: 'flex', flexDirection: 'column', position: 'sticky', top: 0, height: '100vh' }}>
      <div style={{ padding: '20px 18px 18px', borderBottom: '1px solid oklch(0.3 0.04 265)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 26, height: 26, borderRadius: 6, background: 'oklch(0.62 0.17 265)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: MONO, fontSize: 13, fontWeight: 600, color: 'oklch(0.15 0.04 265)' }}>P</div>
          <div>
            <div style={{ fontSize: 13.5, fontWeight: 600, letterSpacing: '0.01em' }}>Safety Permit</div>
            <div style={{ fontSize: 10.5, color: 'oklch(0.72 0.03 265)', fontFamily: MONO, letterSpacing: '0.04em' }}>PTW SYSTEM v2</div>
          </div>
        </div>
      </div>

      <nav style={{ padding: '14px 10px', flex: 1, overflowY: 'auto' }}>
        <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.12em', color: 'oklch(0.62 0.03 265)', padding: '0 8px 8px' }}>เมนูหลัก</div>
        {NAV.map((item) => {
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

      <div style={{ padding: 14, borderTop: '1px solid oklch(0.3 0.04 265)', display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ width: 30, height: 30, borderRadius: '50%', background: 'oklch(0.35 0.05 265)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 600, color: 'oklch(0.85 0.03 265)' }}>สอ</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 12, fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>สมชาย อารักษ์</div>
          <div style={{ fontSize: 10.5, color: 'oklch(0.7 0.03 265)' }}>เจ้าหน้าที่ความปลอดภัย</div>
        </div>
      </div>
    </aside>
  );
}
