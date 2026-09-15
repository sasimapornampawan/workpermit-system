import { useState, type ChangeEvent } from 'react';
import { Button, Field, FormMessage, Select, TextArea, TextInput } from '../components/form';
import { Card, CheckItem, DataState, Pill, TableHead, TableRow, ellipsis } from '../components/ui';
import { ATTACHMENTS, HAZARDS, PERMIT_TYPES, PPE, STEPS } from '../data';
import { useProfile } from '../hooks/useAuth';
import { notifyDataChanged, useBadges, useContractors } from '../hooks/useData';
import { ROLE_LABEL, asTone, badgeStatus, riskTone, supabase, type Badge, type Contractor, type Profile } from '../lib/supabase';
import { C, L, MONO, tone, type Tone } from '../theme';

export type PermitDraft = { title: string; contractorId: string; area: string; detail: string; startAt: string; endAt: string; workers: string };
export const EMPTY_DRAFT: PermitDraft = { title: '', contractorId: '', area: '', detail: '', startAt: '', endAt: '', workers: '' };

type Props = {
  step: number; onStep: (n: number) => void;
  permitType: number; onPermitType: (i: number) => void;
  draft: PermitDraft; onDraft: (d: PermitDraft) => void;
};

const RISK_BY_TONE: Partial<Record<Tone, string>> = { bad: 'สูง', warn: 'ปานกลาง', ok: 'ต่ำ' };

const twoCol = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 16, alignItems: 'start' } as const;

export function Permits({ step, onStep, permitType, onPermitType, draft, onDraft }: Props) {
  const profile = useProfile();
  const contractors = useContractors();
  const badges = useBadges();
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{ error: boolean; text: string } | null>(null);

  const type = PERMIT_TYPES[permitType];
  const risk = RISK_BY_TONE[type.tone] ?? 'ต่ำ';
  const isContractor = profile.role === 'contractor';
  const contractorId = isContractor ? profile.contractor_id ?? '' : draft.contractorId;
  const contractor = contractors.data.find((c) => c.id === contractorId);
  const crew = contractor ? badges.data.filter((b) => b.company === contractor.name) : [];

  async function submit() {
    const missing = [
      !draft.title.trim() && 'ชื่องาน',
      !contractorId && 'บริษัทผู้รับเหมา',
      !draft.area.trim() && 'พื้นที่ปฏิบัติงาน',
      !draft.startAt && 'วันเริ่ม',
      !draft.endAt && 'วันสิ้นสุด',
    ].filter((m): m is string => !!m);
    if (missing.length) {
      setResult({ error: true, text: `กรุณากรอก ${missing.join(', ')} ในขั้นตอนรายละเอียดงาน` });
      return;
    }
    if (draft.endAt <= draft.startAt) {
      setResult({ error: true, text: 'วันสิ้นสุดต้องอยู่หลังวันเริ่ม' });
      return;
    }
    if (!supabase) return;

    setSubmitting(true);
    setResult(null);
    const { data, error } = await supabase
      .from('permits')
      .insert({
        type: `${type.name} — ${draft.title.trim()}`,
        contractor_id: contractorId,
        area: draft.area.trim(),
        risk,
        status: 'pending',
        detail: draft.detail.trim() || null,
        start_at: new Date(draft.startAt).toISOString(),
        end_at: new Date(draft.endAt).toISOString(),
        workers: draft.workers ? Number(draft.workers) : null,
      })
      .select('permit_no')
      .single();
    setSubmitting(false);
    if (error) {
      setResult({ error: true, text: `ส่งไม่สำเร็จ: ${error.message}` });
      return;
    }
    onDraft(EMPTY_DRAFT);
    onStep(1);
    setResult({ error: false, text: `ส่งขออนุมัติแล้ว — เลขที่ ${data.permit_no}` });
    notifyDataChanged();
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <Card style={{ padding: '14px 18px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(195px, 1fr))', gap: 8 }}>
          {STEPS.map((s) => {
            const on = step === s.n, done = step > s.n;
            return (
              <div key={s.n} onClick={() => onStep(s.n)} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 8, cursor: 'pointer', background: on ? C.accBg : done ? 'oklch(0.98 0.008 265)' : '#fff', border: `1px solid ${on ? C.accBd : L.idle}` }}>
                <div style={{ width: 22, height: 22, flex: '0 0 22px', borderRadius: '50%', background: on ? C.acc : done ? C.grn : 'oklch(0.94 0.01 265)', color: on || done ? '#fff' : C.mut, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: MONO, fontSize: 11, fontWeight: 600 }}>
                  {done ? '✓' : s.n}
                </div>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 12.5, fontWeight: 500, ...ellipsis }}>{s.label}</div>
                  <div style={{ fontSize: 10.5, color: 'oklch(0.55 0.02 265)', ...ellipsis }}>{s.hint}</div>
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      {step === 1 && <StepType selected={permitType} onSelect={onPermitType} />}
      {step === 2 && (
        <StepDetails
          draft={draft}
          onDraft={onDraft}
          contractors={contractors.data}
          contractorId={contractorId}
          lockedName={isContractor ? contractor?.name ?? '' : null}
        />
      )}
      {step === 3 && <StepRisk />}
      {step === 4 && (
        <StepApproval
          typeName={type.name}
          risk={risk}
          profile={profile}
          contractor={contractor}
          crew={crew}
          crewLoading={badges.loading}
          crewError={badges.error}
          submitting={submitting}
          onSubmit={submit}
        />
      )}

      <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
        <div onClick={() => onStep(Math.max(1, step - 1))} className="h-outline" style={{ padding: '9px 16px', borderRadius: 8, border: '1px solid oklch(0.9 0.01 265)', background: '#fff', fontSize: 12.5, cursor: 'pointer' }}>ย้อนกลับ</div>
        <div onClick={() => onStep(Math.min(STEPS.length, step + 1))} className="h-dark" style={{ padding: '9px 18px', borderRadius: 8, background: L.navy, color: '#fff', fontSize: 12.5, fontWeight: 500, cursor: 'pointer' }}>ขั้นตอนต่อไป</div>
        {result ? (
          <FormMessage error={result.error}>{result.text}</FormMessage>
        ) : (
          <div style={{ fontSize: 11.5, color: 'oklch(0.58 0.02 265)' }}>เลขที่ Permit จะออกให้อัตโนมัติเมื่อส่งขออนุมัติ</div>
        )}
      </div>
    </div>
  );
}

function StepType({ selected, onSelect }: { selected: number; onSelect: (i: number) => void }) {
  return (
    <Card style={{ padding: 18 }}>
      <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 3 }}>เลือกประเภทงานที่ขออนุญาต</div>
      <div style={{ fontSize: 11.5, color: 'oklch(0.56 0.02 265)', marginBottom: 16 }}>ระดับความเสี่ยงของประเภทงานกำหนดลำดับการอนุมัติ</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(225px, 1fr))', gap: 10 }}>
        {PERMIT_TYPES.map((t, i) => {
          const on = i === selected;
          return (
            <div key={t.code} onClick={() => onSelect(i)} className="h-type" style={{ padding: '14px 15px', borderRadius: 10, cursor: 'pointer', border: `1px solid ${on ? C.accBd : L.idle}`, background: on ? C.accBg : '#fff' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 7 }}>
                <div style={{ width: 10, height: 10, borderRadius: 3, background: tone(t.tone).accent }} />
                <div style={{ fontSize: 13, fontWeight: 600 }}>{t.name}</div>
              </div>
              <div style={{ fontSize: 11.5, color: 'oklch(0.5 0.02 265)', lineHeight: 1.55, marginBottom: 9 }}>{t.detail}</div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Pill t={t.tone} style={{ fontSize: 10.5, padding: '2px 7px' }}>{t.level}</Pill>
                <span style={{ fontFamily: MONO, fontSize: 10.5, color: 'oklch(0.58 0.02 265)' }}>{t.code}</span>
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}

function StepDetails({ draft, onDraft, contractors, contractorId, lockedName }: {
  draft: PermitDraft; onDraft: (d: PermitDraft) => void; contractors: Contractor[]; contractorId: string; lockedName: string | null;
}) {
  const set = (key: keyof PermitDraft) => (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => onDraft({ ...draft, [key]: e.target.value });
  const selectable = [...contractors].filter((c) => c.status !== 'bad').sort((a, b) => a.name.localeCompare(b.name, 'th'));

  return (
    <div style={twoCol}>
      <Card style={{ padding: 18 }}>
        <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 16 }}>รายละเอียดงาน</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14 }}>
          <Field label="ชื่องาน" wide><TextInput value={draft.title} onChange={set('title')} placeholder="เช่น เชื่อมท่อไอน้ำ HS-12" /></Field>
          <Field label="บริษัทผู้รับเหมา" wide>
            {lockedName !== null ? (
              <TextInput value={lockedName} disabled />
            ) : (
              <Select value={contractorId} onChange={set('contractorId')}>
                <option value="">— เลือกบริษัท —</option>
                {selectable.map((c) => <option key={c.id} value={c.id}>{c.name} ({c.code})</option>)}
              </Select>
            )}
          </Field>
          <Field label="พื้นที่ปฏิบัติงาน" wide><TextInput value={draft.area} onChange={set('area')} placeholder="เช่น หน่วยผลิต A — ชั้น 2" /></Field>
          <Field label="ลักษณะงานโดยละเอียด" wide><TextArea value={draft.detail} onChange={set('detail')} /></Field>
          <Field label="วันเริ่ม — เวลา"><TextInput type="datetime-local" value={draft.startAt} onChange={set('startAt')} /></Field>
          <Field label="วันสิ้นสุด — เวลา"><TextInput type="datetime-local" value={draft.endAt} onChange={set('endAt')} /></Field>
          <Field label="จำนวนผู้ปฏิบัติงาน"><TextInput type="number" min={1} value={draft.workers} onChange={set('workers')} /></Field>
        </div>
      </Card>
      <Card style={{ padding: 18 }}>
        <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 12 }}>เอกสารแนบที่กำหนด</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
          {ATTACHMENTS.map((a) => <CheckItem key={a.label} ok={a.ok} label={a.label} detail={a.file} mono />)}
        </div>
        <div className="h-drop" style={{ marginTop: 12, border: '1px dashed oklch(0.85 0.01 265)', borderRadius: 8, padding: 16, textAlign: 'center', background: 'oklch(0.985 0.004 265)', cursor: 'pointer' }}>
          <div style={{ fontSize: 12.5, fontWeight: 500, color: 'oklch(0.42 0.1 265)' }}>ลากไฟล์มาวาง หรือเลือกไฟล์</div>
          <div style={{ fontFamily: MONO, fontSize: 10.5, color: 'oklch(0.58 0.02 265)', marginTop: 4 }}>PDF, JPG — ไม่เกิน 10 MB</div>
        </div>
      </Card>
    </div>
  );
}

const JSA_COLS = 'minmax(0, 1fr) minmax(0, 1.2fr) 78px';

function StepRisk() {
  return (
    <div style={twoCol}>
      <Card style={{ padding: 18 }}>
        <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 3 }}>การชี้บ่งอันตรายและมาตรการควบคุม (JSA)</div>
        <div style={{ fontSize: 11.5, color: 'oklch(0.56 0.02 265)', marginBottom: 14 }}>ระบบเสนอรายการตามประเภทงานที่เลือก</div>
        <div style={{ display: 'grid', gridTemplateColumns: JSA_COLS, gap: 12, padding: '8px 0', borderBottom: `1px solid ${L.headBd}`, fontSize: 10.5, fontWeight: 600, letterSpacing: '0.06em', whiteSpace: 'nowrap', color: 'oklch(0.5 0.02 265)' }}>
          <div>อันตราย</div><div>มาตรการควบคุม</div><div>ระดับ</div>
        </div>
        {HAZARDS.map((h) => (
          <div key={h.hazard} style={{ display: 'grid', gridTemplateColumns: JSA_COLS, gap: 12, padding: '11px 0', borderBottom: '1px solid oklch(0.96 0.008 265)', alignItems: 'center' }}>
            <div style={{ fontSize: 12.5, fontWeight: 500 }}>{h.hazard}</div>
            <div style={{ fontSize: 12, color: 'oklch(0.45 0.02 265)', lineHeight: 1.5 }}>{h.control}</div>
            <div><Pill t={h.tone}>{h.level}</Pill></div>
          </div>
        ))}
      </Card>

      <Card style={{ padding: 18 }}>
        <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 12 }}>อุปกรณ์คุ้มครองความปลอดภัยส่วนบุคคล</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 8 }}>
          {PPE.map((p) => (
            <div key={p.label} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '9px 10px', borderRadius: 7, border: `1px solid ${p.required ? C.accBd : L.idle}`, background: p.required ? C.accBg : '#fff' }}>
              <div style={{ width: 15, height: 15, flex: '0 0 15px', borderRadius: 4, background: p.required ? C.acc : '#fff', border: `1px solid ${p.required ? C.acc : 'oklch(0.85 0.01 265)'}`, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9.5, fontWeight: 700 }}>
                {p.required ? '✓' : ''}
              </div>
              <div style={{ fontSize: 12 }}>{p.label}</div>
            </div>
          ))}
        </div>
        <div style={{ marginTop: 14, padding: '12px 14px', borderRadius: 8, background: 'oklch(0.97 0.03 70)', border: '1px solid oklch(0.9 0.06 70)' }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: 'oklch(0.42 0.1 70)', marginBottom: 4 }}>ต้องมีผู้เฝ้าระวังไฟ (Fire Watch)</div>
          <div style={{ fontSize: 11.5, color: 'oklch(0.45 0.04 70)', lineHeight: 1.5 }}>งานตัด-เชื่อมต้องมีผู้เฝ้าระวังตลอดการทำงาน และเฝ้าต่อเนื่องอีก 30 นาทีหลังเลิกงาน</div>
        </div>
      </Card>
    </div>
  );
}

const WORKER_COLS = 'minmax(0, 1.2fr) 118px minmax(0, 1fr) 104px';

function StepApproval({ typeName, risk, profile, contractor, crew, crewLoading, crewError, submitting, onSubmit }: {
  typeName: string; risk: string; profile: Profile; contractor: Contractor | undefined;
  crew: Badge[]; crewLoading: boolean; crewError: string | null; submitting: boolean; onSubmit: () => void;
}) {
  const chain: { role: string; person: string; pending: boolean }[] = [
    { role: 'ผู้ขออนุญาต', person: `${profile.full_name} — ${ROLE_LABEL[profile.role]}`, pending: true },
    { role: ROLE_LABEL.safety, person: 'ขั้นที่ 1 หลังส่งคำขอ', pending: false },
    { role: ROLE_LABEL.area_owner, person: 'ขั้นที่ 2', pending: false },
    ...(risk === 'สูง' ? [{ role: ROLE_LABEL.manager, person: 'ขั้นที่ 3 — เฉพาะงานความเสี่ยงสูง', pending: false }] : []),
  ];

  return (
    <div style={twoCol}>
      <Card style={{ overflowX: 'auto' }}>
        <div style={{ padding: '14px 18px', borderBottom: `1px solid ${L.headBd}` }}>
          <div style={{ fontSize: 14, fontWeight: 600 }}>ผู้ปฏิบัติงานของบริษัท</div>
          <div style={{ fontSize: 11.5, color: 'oklch(0.56 0.02 265)' }}>{contractor ? contractor.name : 'ตรวจสอบบัตรและผลอบรมจากทะเบียนบัตรผู้รับเหมา'}</div>
        </div>
        <TableHead columns={WORKER_COLS} minWidth={620} labels={['ชื่อ', 'เลขบัตร', 'ผลอบรม', 'สถานะบัตร']} />
        {contractor ? (
          <DataState loading={crewLoading} error={crewError} count={crew.length} empty="ยังไม่มีบัตรผู้ปฏิบัติงานของบริษัทนี้" />
        ) : (
          <DataState loading={false} error={null} count={0} empty="เลือกบริษัทผู้รับเหมาในขั้นตอนรายละเอียดงาน" />
        )}
        {crew.map((b) => {
          const [statusLabel, statusTone] = badgeStatus(b.status);
          return (
            <TableRow key={b.id} columns={WORKER_COLS} minWidth={620} hover={false}>
              <div style={{ fontSize: 12.5, fontWeight: 500, ...ellipsis }}>{b.name}</div>
              <div style={{ fontFamily: MONO, fontSize: 11.5, color: 'oklch(0.5 0.02 265)' }}>{b.card_no}</div>
              <div><Pill t={asTone(b.training_status)}>{b.training}</Pill></div>
              <div><Pill t={statusTone}>{statusLabel}</Pill></div>
            </TableRow>
          );
        })}
      </Card>

      <Card style={{ padding: 18, position: 'sticky', top: 88 }}>
        <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 6 }}>ลำดับการอนุมัติ</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14, fontSize: 12, color: 'oklch(0.48 0.02 265)' }}>
          <span style={{ ...ellipsis, minWidth: 0 }}>{typeName}</span>
          <Pill t={riskTone(risk)}>ความเสี่ยง{risk}</Pill>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {chain.map((a, i) => {
            const last = i === chain.length - 1;
            return (
              <div key={a.role} style={{ display: 'flex', gap: 12 }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: '0 0 22px' }}>
                  <div style={{ width: 22, height: 22, borderRadius: '50%', background: a.pending ? C.amb : '#fff', border: `2px solid ${a.pending ? C.amb : 'oklch(0.88 0.01 265)'}`, color: a.pending ? '#fff' : C.mut, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700 }}>
                    {a.pending ? '!' : i + 1}
                  </div>
                  <div style={{ width: 2, flex: 1, background: last ? 'transparent' : L.idle, minHeight: last ? 0 : 18 }} />
                </div>
                <div style={{ paddingBottom: 16, flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12.5, fontWeight: 600 }}>{a.role}</div>
                  <div style={{ fontSize: 11.5, color: 'oklch(0.5 0.02 265)' }}>{a.person}</div>
                </div>
              </div>
            );
          })}
        </div>
        <div style={{ padding: '10px 12px', borderRadius: 8, background: 'oklch(0.985 0.004 265)', border: `1px solid ${L.headBd}`, fontSize: 11.5, color: 'oklch(0.48 0.02 265)', lineHeight: 1.55, marginBottom: 12 }}>
          ใบอนุญาตมีผล 12 ชม. นับจากเวลาอนุมัติ และต้องปิดงานพร้อมตรวจพื้นที่ก่อนหมดอายุ
        </div>
        <Button disabled={submitting} onClick={onSubmit} style={{ width: '100%', padding: 10, fontSize: 13 }}>
          {submitting ? 'กำลังส่ง...' : 'ส่งขออนุมัติ'}
        </Button>
      </Card>
    </div>
  );
}
