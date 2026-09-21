import { supabase } from './supabase';

export const PERMIT_FILES_BUCKET = 'permit-files';
export const MAX_ATTACHMENT_MB = 10;
export const ATTACHMENT_ACCEPT = '.pdf,.jpg,.jpeg,.png';
const ALLOWED_TYPES = ['application/pdf', 'image/jpeg', 'image/png'];

export type PermitAttachment = {
  id: string;
  permit_id: string;
  kind: string;
  file_path: string;
  file_name: string;
  size: number;
  content_type: string | null;
  uploaded_by: string;
  uploaded_at: string;
  profiles: { full_name: string } | null;
};

export function attachmentProblem(file: File): string | null {
  if (!ALLOWED_TYPES.includes(file.type)) return `${file.name}: รองรับเฉพาะไฟล์ PDF, JPG และ PNG`;
  if (file.size > MAX_ATTACHMENT_MB * 1024 * 1024) return `${file.name}: ไฟล์ใหญ่เกิน ${MAX_ATTACHMENT_MB} MB`;
  return null;
}

export const formatSize = (bytes: number) =>
  bytes >= 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`;

/** Returns an error message, or null on success. */
export async function uploadPermitFile(permitId: string, kind: string, file: File): Promise<string | null> {
  if (!supabase) return 'ยังไม่ได้ตั้งค่า Supabase';
  const problem = attachmentProblem(file);
  if (problem) return problem;

  // Storage keys reject many non-ASCII characters (Thai file names), so store under a random name and keep the original in the table.
  const ext = (file.name.split('.').pop() ?? '').toLowerCase().replace(/[^a-z0-9]/g, '') || 'bin';
  const path = `${permitId}/${crypto.randomUUID()}.${ext}`;

  const { error: uploadErr } = await supabase.storage.from(PERMIT_FILES_BUCKET).upload(path, file, { contentType: file.type });
  if (uploadErr) return `${file.name}: อัปโหลดไม่สำเร็จ (${uploadErr.message})`;

  const { error: rowErr } = await supabase.from('permit_attachments').insert({
    permit_id: permitId,
    kind,
    file_path: path,
    file_name: file.name,
    size: file.size,
    content_type: file.type,
  });
  if (rowErr) {
    await supabase.storage.from(PERMIT_FILES_BUCKET).remove([path]);
    return `${file.name}: บันทึกไม่สำเร็จ (${rowErr.message})`;
  }
  return null;
}

/** Opens a short-lived link in a new tab; the tab is opened first so popup blockers allow it. */
export async function openPermitFile(attachment: PermitAttachment): Promise<string | null> {
  if (!supabase) return 'ยังไม่ได้ตั้งค่า Supabase';
  const tab = window.open('', '_blank');
  const { data, error } = await supabase.storage.from(PERMIT_FILES_BUCKET).createSignedUrl(attachment.file_path, 60);
  if (error || !data) {
    tab?.close();
    return `เปิดไฟล์ไม่สำเร็จ: ${error?.message ?? 'ไม่พบไฟล์'}`;
  }
  if (tab) tab.location.href = data.signedUrl;
  else window.location.href = data.signedUrl;
  return null;
}

export async function deletePermitFile(attachment: PermitAttachment): Promise<string | null> {
  if (!supabase) return 'ยังไม่ได้ตั้งค่า Supabase';
  const { data: removed, error: storageErr } = await supabase.storage.from(PERMIT_FILES_BUCKET).remove([attachment.file_path]);
  if (storageErr || !removed?.length) return `ลบไฟล์ไม่สำเร็จ: ${storageErr?.message ?? 'ไม่มีสิทธิ์ลบไฟล์นี้'}`;
  const { error: rowErr } = await supabase.from('permit_attachments').delete().eq('id', attachment.id);
  if (rowErr) return `ลบรายการไม่สำเร็จ: ${rowErr.message}`;
  return null;
}
