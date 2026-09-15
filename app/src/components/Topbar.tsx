import { useState } from 'react';

export function Topbar({ title, subtitle, onNewPermit }: { title: string; subtitle: string; onNewPermit: () => void }) {
  const [query, setQuery] = useState('');
  return (
    <header style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '12px 16px', padding: '14px 24px', background: '#fff', borderBottom: '1px solid oklch(0.91 0.01 265)', position: 'sticky', top: 0, zIndex: 5 }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 18, fontWeight: 600, letterSpacing: '-0.01em' }}>{title}</div>
        <div style={{ fontSize: 12, color: 'oklch(0.54 0.02 265)' }}>{subtitle}</div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '7px 11px', border: '1px solid oklch(0.9 0.01 265)', borderRadius: 7, background: 'oklch(0.985 0.004 265)', minWidth: 190 }}>
          <div style={{ width: 11, height: 11, border: '1.5px solid oklch(0.62 0.02 265)', borderRadius: '50%' }} />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="ค้นหาเลขที่ permit, ผู้รับเหมา"
            style={{ border: 'none', background: 'none', outline: 'none', fontSize: 12.5, width: '100%', color: 'inherit' }}
          />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 12px', borderRadius: 7, background: 'oklch(0.96 0.02 145)', border: '1px solid oklch(0.87 0.05 145)', fontSize: 12, fontWeight: 500, whiteSpace: 'nowrap', color: 'oklch(0.42 0.1 145)' }}>
          <div style={{ width: 7, height: 7, borderRadius: '50%', background: 'oklch(0.62 0.15 145)' }} />
          ระบบพร้อมใช้งาน
        </div>
        <div onClick={onNewPermit} className="h-primary" style={{ padding: '8px 14px', borderRadius: 7, background: 'oklch(0.52 0.16 265)', color: '#fff', fontSize: 12.5, fontWeight: 500, whiteSpace: 'nowrap', cursor: 'pointer' }}>
          + ขอ Work Permit
        </div>
      </div>
    </header>
  );
}
