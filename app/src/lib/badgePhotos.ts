import { useEffect, useState } from 'react';
import { supabase } from './supabase';

const BUCKET = 'badge-photos';
const MAX_SIDE = 600;
const MAX_INPUT_MB = 15;

/** Shrinks the photo so every badge photo is small and JPEG, whatever the phone camera produced. */
async function toJpeg(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext('2d')!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('แปลงรูปไม่สำเร็จ'))), 'image/jpeg', 0.85);
  });
}

/** Returns an error message, or null on success. */
export async function uploadBadgePhoto(badgeId: string, file: File): Promise<string | null> {
  if (!supabase) return 'ยังไม่ได้ตั้งค่า Supabase';
  if (!['image/jpeg', 'image/png'].includes(file.type)) return 'รองรับเฉพาะรูป JPG และ PNG';
  if (file.size > MAX_INPUT_MB * 1024 * 1024) return `รูปใหญ่เกิน ${MAX_INPUT_MB} MB`;

  let jpeg: Blob;
  try {
    jpeg = await toJpeg(file);
  } catch {
    return 'อ่านไฟล์รูปไม่ได้';
  }

  const path = `${badgeId}/${crypto.randomUUID()}.jpg`;
  const { error: uploadErr } = await supabase.storage.from(BUCKET).upload(path, jpeg, { contentType: 'image/jpeg' });
  if (uploadErr) return `อัปโหลดรูปไม่สำเร็จ: ${uploadErr.message}`;

  const { data: oldPath, error: setErr } = await supabase.rpc('set_badge_photo', { p_badge_id: badgeId, p_path: path });
  if (setErr) {
    await supabase.storage.from(BUCKET).remove([path]);
    return `บันทึกรูปไม่สำเร็จ: ${setErr.message}`;
  }
  if (oldPath) await supabase.storage.from(BUCKET).remove([oldPath as string]);
  return null;
}

/** Short-lived link to a private photo; null while loading or when there is no photo. */
export function useBadgePhotoUrl(path: string | null) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    setUrl(null);
    if (!supabase || !path) return;
    let cancelled = false;
    supabase.storage.from(BUCKET).createSignedUrl(path, 3600).then(({ data }) => {
      if (!cancelled) setUrl(data?.signedUrl ?? null);
    });
    return () => {
      cancelled = true;
    };
  }, [path]);
  return url;
}

export const verifyUrl = (token: string) => `${window.location.origin}/?verify=${token}`;
