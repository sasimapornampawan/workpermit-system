import { useEffect, useRef, useState } from 'react';
import { useProfile } from '../hooks/useAuth';
import { notifyDataChanged, usePermitApprovals, usePermitEvents } from '../hooks/useData';
import {
  PERMIT_ACTIONS, ROLE_LABEL, STATUS_ROLES, permitStatus, riskTone, supabase,
  type Permit, type PermitAction,
} from '../lib/supabase';
import { C, L, MONO, tone, type Tone } from '../theme';
import { Button, FormMessage, TextArea } from './form';
import { Card, DataState, Pill } from './ui';

const formatDateTime = (iso: string) => new Date(iso).toLocaleString('th-TH', { dateStyle: 'medium', timeStyle: 'short' });

type HistoryItem = { at: string; title: string; by: string | null; note: string | null; tone: Tone };

export function PermitDetail({ permit, onClose }: { permit: Permit; onClose: () => void }) {
  const profile = useProfile();
  const approvals = usePermitApprovals();
  const events = usePermitEvents();
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState<PermitAction | null>(null);
  const [message, setMessage] = useState<{ error: boolean; text: string } | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setNote('');
    setMessage(null);
    ref.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, [permit.id]);

  const [statusLabel, statusTone] = permitStatus(permit.status);
  const actions = (Object.keys(PERMIT_ACTIONS) as PermitAction[]).filter((a) => PERMIT_ACTIONS[a].from.includes(permit.status));
  const canAct = STATUS_ROLES.includes(profile.role) && actions.length > 0;

  const submitted: HistoryItem = { at: permit.created_at, title: 'ยื่นคำขอ', by: null, note: null, tone: 'info' };
  const history: HistoryItem[] = [
    submitted,
    ...approvals.data
      .filter((a) => a.permit_id === permit.id)
      .map((a): HistoryItem => ({
        at: a.decided_at,
        title: `${ROLE_LABEL[a.step]} ${a.decision === 'approved' ? 'อนุมัติ' : 'ไม่อนุมัติ'}`,
        by: a.profiles?.full_name ?? null,
        note: a.note,
        tone: a.decision === 'approved' ? 'ok' : 'bad',
      })),
    ...events.data
      .filter((e) => e.permit_id === permit.id)
      .map((e): HistoryItem => ({
        at: e.acted_at,
        title: PERMIT_ACTIONS[e.action as PermitAction]?.label ?? e.action,
        by: e.profiles?.full_name ?? null,
        note: e.note,
        tone: permitStatus(e.to_status)[1],
      })),
  ].sort((a, b) => a.at.localeCompare(b.at));

  async function act(action: PermitAction) {
    if (!supabase) return;
    const config = PERMIT_ACTIONS[action];
    if (config.needsNote && !note.trim()) {
      setMessage({ error: true, text: 'กรุณาระบุเหตุผลที่ระงับงานในช่องหมายเหตุ' });
      return;
    }
    if (action === 'close' && !window.confirm(`ยืนยันปิดงาน ${permit.permit_no}? ปิดแล้วเปิดใหม่ไม่ได้`)) return;
    setBusy(action);
    setMessage(null);
    const { error } = await supabase.rpc('change_permit_status', { p_permit_id: permit.id, p_action: action, p_note: note.trim() || null });
    setBusy(null);
    if (error) {
      setMessage({ error: true, text: `ดำเนินการไม่สำเร็จ: ${error.message}` });
      return;
    }
    setNote('');
    setMessage({ error: false, text: `${config.label} ${permit.permit_no} แล้ว` });
    notifyDataChanged();
  }

  const fields: [string, string][] = [
    ['ประเภทงาน', permit.type],
    ['ผู้รับเหมา', permit.contractors?.name ?? '—'],
    ['พื้นที่ปฏิบัติงาน', permit.area],
    ['ช่วงเวลา', permit.start_at && permit.end_at ? `${formatDateTime(permit.start_at)} – ${formatDateTime(permit.end_at)}` : '—'],
    ['จำนวนผู้ปฏิบัติงาน', permit.workers ? `${permit.workers} คน` : '—'],
  ];

  return (
    <div ref={ref}>
      <Card style={{ padding: 18 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14, flexWrap: 'wrap' }}>
          <div style={{ fontFamily: MONO, fontSize: 15, fontWeight: 600, color: 'oklch(0.4 0.1 265)' }}>{permit.permit_no}</div>
          <Pill t={statusTone}>{statusLabel}</Pill>
          <Pill t={riskTone(permit.risk)}>ความเสี่ยง{permit.risk}</Pill>
          <div style={{ flex: 1 }} />
          <Button variant="outline" onClick={onClose} style={{ padding: '5px 11px', fontSize: 12 }}>ปิดหน้าต่าง</Button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 20, alignItems: 'start' }}>
          <div>
            <div style={{ display: 'grid', gridTemplateColumns: '130px minmax(0, 1fr)', gap: '8px 12px', fontSize: 12.5 }}>
              {fields.map(([label, value]) => (
                <div key={label} style={{ display: 'contents' }}>
                  <div style={{ color: 'oklch(0.52 0.02 265)' }}>{label}</div>
                  <div>{value}</div>
                </div>
              ))}
            </div>
            {permit.detail && (
              <div style={{ marginTop: 12, padding: '10px 12px', borderRadius: 8, background: 'oklch(0.985 0.004 265)', border: `1px solid ${L.headBd}`, fontSize: 12.5, lineHeight: 1.55, whiteSpace: 'pre-wrap' }}>{permit.detail}</div>
            )}
            {permit.permit_next_step && (
              <div style={{ marginTop: 12, fontSize: 12.5, color: tone('warn').fg }}>รอ{ROLE_LABEL[permit.permit_next_step]}พิจารณา</div>
            )}

            {canAct && (
              <div style={{ marginTop: 16, paddingTop: 14, borderTop: `1px solid ${L.headBd}` }}>
                <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}>เปลี่ยนสถานะงาน</div>
                <TextArea rows={2} value={note} onChange={(e) => setNote(e.target.value)} placeholder="หมายเหตุ (ต้องระบุเหตุผลเมื่อระงับงาน)" />
                <div style={{ display: 'flex', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
                  {actions.map((a) => (
                    <Button key={a} variant={a === 'start' || a === 'resume' ? 'primary' : 'outline'} disabled={busy !== null} onClick={() => act(a)}>
                      {busy === a ? 'กำลังบันทึก...' : PERMIT_ACTIONS[a].label}
                    </Button>
                  ))}
                </div>
              </div>
            )}
            {message && <FormMessage error={message.error} style={{ marginTop: 10 }}>{message.text}</FormMessage>}
          </div>

          <div>
            <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 10 }}>ประวัติ</div>
            <DataState loading={approvals.loading || events.loading} error={approvals.error ?? events.error} count={history.length} style={{ padding: 0 }} />
            {history.map((h, i) => {
              const t = tone(h.tone);
              const last = i === history.length - 1;
              return (
                <div key={`${h.at}-${i}`} style={{ display: 'flex', gap: 10 }}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: '0 0 12px' }}>
                    <div style={{ width: 10, height: 10, marginTop: 4, borderRadius: '50%', background: t.accent }} />
                    <div style={{ width: 2, flex: 1, background: last ? 'transparent' : L.idle, minHeight: last ? 0 : 14 }} />
                  </div>
                  <div style={{ paddingBottom: 12, minWidth: 0 }}>
                    <div style={{ fontSize: 12.5, fontWeight: 500 }}>{h.title}{h.by ? ` — ${h.by}` : ''}</div>
                    <div style={{ fontFamily: MONO, fontSize: 10.5, color: C.mut }}>{formatDateTime(h.at)}</div>
                    {h.note && <div style={{ fontSize: 12, color: 'oklch(0.45 0.02 265)', marginTop: 2 }}>{h.note}</div>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </Card>
    </div>
  );
}
