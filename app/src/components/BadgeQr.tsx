import QRCode from 'qrcode';
import { useEffect, useState } from 'react';

export function BadgeQr({ value, size }: { value: string; size: number }) {
  const [src, setSrc] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    QRCode.toDataURL(value, { margin: 0, width: size * 3, errorCorrectionLevel: 'M', color: { dark: '#1e2a44', light: '#ffffff' } })
      .then((url) => !cancelled && setSrc(url))
      .catch(() => !cancelled && setSrc(null));
    return () => {
      cancelled = true;
    };
  }, [value, size]);

  return src
    ? <img src={src} alt="QR สำหรับตรวจสอบบัตร" width={size} height={size} style={{ display: 'block', flex: `0 0 ${size}px` }} />
    : <div style={{ width: size, height: size, flex: `0 0 ${size}px`, background: 'oklch(0.95 0.01 265)', borderRadius: 3 }} />;
}
