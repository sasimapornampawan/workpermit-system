import { BRAND } from '../brand';

/** Logo on a white tile, so its navy outline stays visible on dark backgrounds. */
export function BrandMark({ height }: { height: number }) {
  return (
    <div style={{ flex: 'none', background: '#fff', borderRadius: 6, padding: Math.round(height * 0.14), lineHeight: 0 }}>
      <img src={BRAND.logo} alt={BRAND.nameEn} style={{ height, width: 'auto', display: 'block' }} />
    </div>
  );
}
