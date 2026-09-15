import type { CSSProperties, ReactNode } from 'react';
import { L, MONO, tone, type Tone } from '../theme';

export function Card({ children, style, className }: { children: ReactNode; style?: CSSProperties; className?: string }) {
  return (
    <div className={className} style={{ background: '#fff', border: `1px solid ${L.cardBd}`, borderRadius: 10, ...style }}>
      {children}
    </div>
  );
}

export function CardTitle({ title, sub, style }: { title: ReactNode; sub?: ReactNode; style?: CSSProperties }) {
  return (
    <div style={style}>
      <div style={{ fontSize: 14, fontWeight: 600 }}>{title}</div>
      {sub && <div style={{ fontSize: 11.5, color: 'oklch(0.56 0.02 265)' }}>{sub}</div>}
    </div>
  );
}

/** Small colored status label */
export function Pill({ t, children, style }: { t: Tone; children: ReactNode; style?: CSSProperties }) {
  const c = tone(t);
  return (
    <span style={{ fontSize: 11, fontWeight: 500, padding: '2px 8px', borderRadius: 4, background: c.bg, color: c.fg, ...style }}>
      {children}
    </span>
  );
}

type GridTableProps = { columns: string; minWidth: number; gap?: number };

export function TableHead({ columns, minWidth, gap = 12, labels }: GridTableProps & { labels: string[] }) {
  return (
    <div
      style={{
        display: 'grid', gridTemplateColumns: columns, minWidth, gap, padding: '9px 18px',
        background: L.headBg, borderBottom: `1px solid ${L.headBd}`, fontSize: 10.5, fontWeight: 600,
        letterSpacing: '0.06em', whiteSpace: 'nowrap', color: 'oklch(0.5 0.02 265)',
      }}
    >
      {labels.map((l) => <div key={l}>{l}</div>)}
    </div>
  );
}

export function TableRow({
  columns, minWidth, gap = 12, children, hover = true, style, className, onClick,
}: GridTableProps & { children: ReactNode; hover?: boolean; style?: CSSProperties; className?: string; onClick?: () => void }) {
  return (
    <div
      onClick={onClick}
      className={className ?? (hover ? 'h-row' : undefined)}
      style={{
        display: 'grid', gridTemplateColumns: columns, minWidth, gap, padding: '11px 18px',
        borderBottom: `1px solid ${L.rowBd}`, alignItems: 'center', ...style,
      }}
    >
      {children}
    </div>
  );
}

export const ellipsis: CSSProperties = { whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' };

/** Loading / error / empty message for a Supabase-backed list; renders nothing once rows exist */
export function DataState({ loading, error, count, empty = 'ยังไม่มีข้อมูล', style }: {
  loading: boolean; error: string | null; count: number; empty?: string; style?: CSSProperties;
}) {
  const message = loading ? 'กำลังโหลดข้อมูล...' : error ? `โหลดข้อมูลไม่สำเร็จ: ${error}` : count === 0 ? empty : null;
  if (!message) return null;
  return <div style={{ padding: '14px 18px', fontSize: 12.5, color: error ? tone('bad').fg : 'oklch(0.5 0.02 265)', ...style }}>{message}</div>;
}

/** Checklist item with ✓ / ! marker (badge conditions, permit attachments) */
export function CheckItem({ ok, label, detail, mono }: { ok: boolean; label: string; detail: string; mono?: boolean }) {
  const t = tone(ok ? 'ok' : 'warn');
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: mono ? 10 : 9, padding: '10px 12px', borderRadius: 8, background: t.bg, border: `1px solid ${t.bd}` }}>
      <div style={{ width: 16, height: 16, flex: '0 0 16px', borderRadius: 4, background: t.accent, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700 }}>
        {ok ? '✓' : '!'}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 12.5, fontWeight: 500 }}>{label}</div>
        {mono ? (
          <div style={{ fontFamily: MONO, fontSize: 10.5, color: 'oklch(0.55 0.02 265)', ...ellipsis }}>{detail}</div>
        ) : (
          <div style={{ fontSize: 11, color: 'oklch(0.5 0.02 265)' }}>{detail}</div>
        )}
      </div>
    </div>
  );
}

/** Horizontal progress track */
export function Bar({ pct, color, height, radius, track = 'oklch(0.95 0.01 265)', style }: {
  pct: string; color: string; height: number; radius: number; track?: string; style?: CSSProperties;
}) {
  return (
    <div style={{ height, borderRadius: radius, background: track, overflow: 'hidden', ...style }}>
      <div style={{ height: '100%', width: pct, background: color, borderRadius: radius }} />
    </div>
  );
}

/** KPI / stat tile */
export function StatTile({ label, value, delta, deltaColor, note, dot, size = 28, padding = '14px 16px' }: {
  label: string; value: string; delta?: string; deltaColor?: string; note?: string; dot?: string; size?: number; padding?: string;
}) {
  return (
    <Card style={{ padding }}>
      {dot ? (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
          <div style={{ fontSize: 11.5, color: 'oklch(0.5 0.02 265)', fontWeight: 500 }}>{label}</div>
          <div style={{ width: 8, height: 8, borderRadius: 2, background: dot }} />
        </div>
      ) : (
        <div style={{ fontSize: 11.5, color: 'oklch(0.5 0.02 265)', marginBottom: 7 }}>{label}</div>
      )}
      <div style={{ display: 'flex', alignItems: 'baseline', gap: dot ? 8 : 7 }}>
        <div style={{ fontFamily: MONO, fontSize: size, fontWeight: 500, letterSpacing: dot ? '-0.02em' : undefined, lineHeight: 1 }}>{value}</div>
        {delta && <div style={{ fontSize: 11, color: deltaColor, fontWeight: 500 }}>{delta}</div>}
      </div>
      {note && <div style={{ fontSize: 11, color: 'oklch(0.6 0.02 265)', marginTop: 6 }}>{note}</div>}
    </Card>
  );
}

export function PrimaryButton({ children, style, onClick }: { children: ReactNode; style?: CSSProperties; onClick?: () => void }) {
  return (
    <div onClick={onClick} className="h-primary" style={{ background: 'oklch(0.52 0.16 265)', color: '#fff', fontWeight: 500, cursor: 'pointer', ...style }}>
      {children}
    </div>
  );
}

export function OutlineButton({ children, style, onClick }: { children: ReactNode; style?: CSSProperties; onClick?: () => void }) {
  return (
    <div onClick={onClick} className="h-outline" style={{ border: '1px solid oklch(0.9 0.01 265)', cursor: 'pointer', ...style }}>
      {children}
    </div>
  );
}
