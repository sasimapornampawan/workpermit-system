import { useState, type ChangeEvent } from 'react';
import { ATTACHMENT_KINDS } from '../data';
import { useProfile } from '../hooks/useAuth';
import { notifyDataChanged, usePermitAttachments } from '../hooks/useData';
import {
  ATTACHMENT_ACCEPT, MAX_ATTACHMENT_MB, attachmentProblem, deletePermitFile, formatSize, openPermitFile, uploadPermitFile,
} from '../lib/attachments';
import { C, L, MONO, tone } from '../theme';
import { FormMessage, Select } from './form';
import { DataState, ellipsis } from './ui';

export type DraftFile = { kind: string; file: File };

const pickerButton = {
  display: 'inline-block', padding: '5px 10px', borderRadius: 6, border: '1px solid oklch(0.9 0.01 265)',
  background: '#fff', fontSize: 11.5, fontWeight: 500, cursor: 'pointer', whiteSpace: 'nowrap',
} as const;

/** File input styled as a button; resets itself so picking the same file twice still fires. */
function FilePicker({ label, disabled, onFiles }: { label: string; disabled?: boolean; onFiles: (files: File[]) => void }) {
  function change(e: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    e.target.value = '';
    if (files.length) onFiles(files);
  }
  return (
    <label className={disabled ? undefined : 'h-outline'} style={{ ...pickerButton, opacity: disabled ? 0.55 : 1, cursor: disabled ? 'default' : 'pointer' }}>
      {label}
      <input type="file" multiple accept={ATTACHMENT_ACCEPT} disabled={disabled} onChange={change} style={{ display: 'none' }} />
    </label>
  );
}

/** Files chosen in the permit request form; uploaded after the permit is created. */
export function AttachmentPicker({ files, onChange }: { files: DraftFile[]; onChange: (files: DraftFile[]) => void }) {
  const [error, setError] = useState<string | null>(null);

  function add(kind: string, picked: File[]) {
    const problems = picked.map(attachmentProblem).filter((p): p is string => !!p);
    setError(problems.length ? problems.join(' · ') : null);
    const valid = picked.filter((f) => !attachmentProblem(f));
    if (valid.length) onChange([...files, ...valid.map((file) => ({ kind, file }))]);
  }

  return (
    <div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
        {ATTACHMENT_KINDS.map((kind) => {
          const chosen = files.filter((f) => f.kind === kind);
          const t = tone(chosen.length ? 'ok' : 'flat');
          return (
            <div key={kind} style={{ padding: '10px 12px', borderRadius: 8, background: t.bg, border: `1px solid ${t.bd}` }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                <div style={{ width: 16, height: 16, flex: '0 0 16px', borderRadius: 4, background: chosen.length ? t.accent : '#fff', border: `1px solid ${chosen.length ? t.accent : 'oklch(0.85 0.01 265)'}`, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700 }}>
                  {chosen.length ? '✓' : ''}
                </div>
                <div style={{ flex: 1, minWidth: 0, fontSize: 12.5, fontWeight: 500 }}>{kind}</div>
                <FilePicker label="เลือกไฟล์" onFiles={(picked) => add(kind, picked)} />
              </div>
              {chosen.map((f) => (
                <div key={`${f.file.name}-${f.file.size}-${f.file.lastModified}`} style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 6, paddingLeft: 25 }}>
                  <div style={{ flex: 1, minWidth: 0, fontFamily: MONO, fontSize: 11, color: 'oklch(0.45 0.02 265)', ...ellipsis }}>{f.file.name}</div>
                  <div style={{ fontFamily: MONO, fontSize: 10.5, color: C.mut }}>{formatSize(f.file.size)}</div>
                  <button
                    type="button"
                    aria-label={`นำ ${f.file.name} ออก`}
                    onClick={() => onChange(files.filter((x) => x !== f))}
                    style={{ border: 'none', background: 'none', color: tone('bad').fg, cursor: 'pointer', fontSize: 13, padding: '0 2px' }}
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          );
        })}
      </div>
      <div style={{ fontFamily: MONO, fontSize: 10.5, color: 'oklch(0.58 0.02 265)', marginTop: 8 }}>
        PDF, JPG, PNG — ไม่เกิน {MAX_ATTACHMENT_MB} MB ต่อไฟล์ · ไฟล์จะอัปโหลดเมื่อกดส่งขออนุมัติ
      </div>
      {error && <FormMessage error style={{ marginTop: 8 }}>{error}</FormMessage>}
    </div>
  );
}

/** Attachments of an existing permit: open, add, remove. */
export function PermitAttachments({ permitId, canUpload }: { permitId: string; canUpload: boolean }) {
  const profile = useProfile();
  const attachments = usePermitAttachments();
  const [kind, setKind] = useState(ATTACHMENT_KINDS[0]);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ error: boolean; text: string } | null>(null);

  const list = attachments.data.filter((a) => a.permit_id === permitId).sort((a, b) => a.uploaded_at.localeCompare(b.uploaded_at));

  async function upload(files: File[]) {
    setBusy(true);
    setMessage(null);
    const failures: string[] = [];
    for (const file of files) {
      const failure = await uploadPermitFile(permitId, kind, file);
      if (failure) failures.push(failure);
    }
    setBusy(false);
    setMessage(failures.length ? { error: true, text: failures.join(' · ') } : { error: false, text: `อัปโหลด ${files.length} ไฟล์แล้ว` });
    notifyDataChanged();
  }

  async function open(id: string) {
    const attachment = list.find((a) => a.id === id);
    if (!attachment) return;
    const failure = await openPermitFile(attachment);
    if (failure) setMessage({ error: true, text: failure });
  }

  async function remove(id: string) {
    const attachment = list.find((a) => a.id === id);
    if (!attachment || !window.confirm(`ลบไฟล์ ${attachment.file_name}?`)) return;
    setBusy(true);
    setMessage(null);
    const failure = await deletePermitFile(attachment);
    setBusy(false);
    setMessage(failure ? { error: true, text: failure } : { error: false, text: `ลบ ${attachment.file_name} แล้ว` });
    notifyDataChanged();
  }

  return (
    <div>
      <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 10 }}>เอกสารแนบ ({list.length})</div>
      <DataState loading={attachments.loading} error={attachments.error} count={list.length} empty="ยังไม่มีเอกสารแนบ" style={{ padding: 0 }} />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {list.map((a) => (
          <div key={a.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', borderRadius: 7, border: `1px solid ${L.idle}`, background: '#fff' }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <button
                type="button"
                onClick={() => open(a.id)}
                className="h-underline"
                style={{ border: 'none', background: 'none', padding: 0, cursor: 'pointer', color: 'oklch(0.42 0.13 265)', fontSize: 12.5, fontWeight: 500, textAlign: 'left', maxWidth: '100%', ...ellipsis }}
              >
                {a.file_name}
              </button>
              <div style={{ fontSize: 10.5, color: C.mut, ...ellipsis }}>
                {a.kind} · {formatSize(a.size)} · {a.profiles?.full_name ?? '—'} · {new Date(a.uploaded_at).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: '2-digit' })}
              </div>
            </div>
            {(a.uploaded_by === profile.id || profile.role === 'safety') && (
              <button
                type="button"
                disabled={busy}
                onClick={() => remove(a.id)}
                style={{ border: 'none', background: 'none', color: tone('bad').fg, cursor: busy ? 'default' : 'pointer', fontSize: 11.5 }}
              >
                ลบ
              </button>
            )}
          </div>
        ))}
      </div>
      {canUpload && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
          <Select value={kind} onChange={(e) => setKind(e.target.value)} style={{ flex: 1, minWidth: 180, padding: '6px 9px', fontSize: 12 }} aria-label="ประเภทเอกสาร">
            {ATTACHMENT_KINDS.map((k) => <option key={k}>{k}</option>)}
          </Select>
          <FilePicker label={busy ? 'กำลังอัปโหลด...' : 'อัปโหลดไฟล์'} disabled={busy} onFiles={upload} />
        </div>
      )}
      {message && <FormMessage error={message.error} style={{ marginTop: 8 }}>{message.text}</FormMessage>}
    </div>
  );
}
