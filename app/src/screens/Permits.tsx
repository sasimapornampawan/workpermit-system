import { useState, type ChangeEvent } from 'react';
import { Button, Field, FormMessage, Select, TextArea, TextInput } from '../components/form';
import { AttachmentPicker, type DraftFile } from '../components/Attachments';
import { Card, DataState, Pill, TableHead, TableRow, ellipsis } from '../components/ui';
import { PERMIT_TYPES, STEPS } from '../data';
import { uploadPermitFile } from '../lib/attachments';
import { useProfile } from '../hooks/useAuth';
import { notifyDataChanged, useBadges, useContractors, useJsaHazards, usePpeItems } from '../hooks/useData';
import { ROLE_LABEL, asTone, badgeStatus, riskTone, supabase, type Badge, type Contractor, type Profile } from '../lib/supabase';
import { C, L, MONO, tone, type Tone } from '../theme';

export type PermitDraft = {
  title: string; contractorId: string; area: string; detail: string; startAt: string; endAt: string; workers: string;
  files: DraftFile[];
  /** PPE chosen on top of the ones marked required for the work type. */
  extraPpe: string[];
};
export const EMPTY_DRAFT: PermitDraft = {
  title: '', contractorId: '', area: '', detail: '', startAt: '', endAt: '', workers: '', files: [], extraPpe: [],
};

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
  const ppe = usePpeItems();
  const requiredPpe = ppe.data
    .filter((p) => p.active && p.required && (p.permit_type_code === null || p.permit_type_code === type.code))
    .map((p) => p.label);

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
        ppe: [...new Set([...requiredPpe, ...draft.extraPpe])],
      })
      .select('id, permit_no')
      .single();
    if (error) {
      setSubmitting(false);
      setResult({ error: true, text: `ส่งไม่สำเร็จ: ${error.message}` });
      return;
    }

    const failures: string[] = [];
    for (const { kind, file } of draft.files) {
      const failure = await uploadPermitFile(data.id, kind, file);
      if (failure) failures.push(failure);
    }
    setSubmitting(false);
    onDraft(EMPTY_DRAFT);
    onStep(1);
    setResult(failures.length
      ? { error: true, text: `ส่งขออนุมัติแล้ว — เลขที่ ${data.permit_no} แต่แนบไฟล์ไม่สำเร็จ ${failures.length} ไฟล์ (${failures.join(' · ')}) ให้แนบใหม่ในหน้ารายละเอียด Permit` }
      : { error: false, text: `ส่งขออนุมัติแล้ว — เลขที่ ${data.permit_no}${draft.files.length ? ` พร้อมเอกสารแนบ ${draft.files.length} ไฟล์` : ''}` });
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
      {step === 3 && (
        <StepRisk typeCode={type.code} extraPpe={draft.extraPpe} onExtraPpe={(extraPpe) => onDraft({ ...draft, extraPpe })} />
      )}
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
        <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 12 }}>เอกสารแนบ</div>
        <AttachmentPicker files={draft.files} onChange={(files) => onDraft({ ...draft, files })} />
      </Card>
    </div>
  );
}

const JSA_COLS = 'minmax(0, 1fr) minmax(0, 1.2fr) 78px';

function StepRisk({ typeCode, extraPpe, onExtraPpe }: { typeCode: string; extraPpe: string[]; onExtraPpe: (labels: string[]) => void }) {
  const hazards = useJsaHazards();
  const ppe = usePpeItems();
  const [custom, setCustom] = useState('');
  const applies = (code: string | null) => code === null || code === typeCode;
  const hazardList = hazards.data.filter((h) => h.active && applies(h.permit_type_code)).sort((a, b) => a.sort - b.sort);
  const ppeList = ppe.data.filter((p) => p.active && applies(p.permit_type_code)).sort((a, b) => Number(b.required) - Number(a.required) || a.sort - b.sort);
  const highCount = hazardList.filter((h) => h.level === 'สูง').length;
  const catalogueLabels = new Set(ppeList.map((p) => p.label));
  const customPpe = extraPpe.filter((label) => !catalogueLabels.has(label));

  const toggle = (label: string) =>
    onExtraPpe(extraPpe.includes(label) ? extraPpe.filter((l) => l !== label) : [...extraPpe, label]);

  function addCustom() {
    const label = custom.trim();
    if (!label || extraPpe.includes(label) || catalogueLabels.has(label)) {
      setCustom('');
      return;
    }
    onExtraPpe([...extraPpe, label]);
    setCustom('');
  }

  return (
    <div style={twoCol}>
      <Card style={{ padding: 18 }}>
        <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 3 }}>การชี้บ่งอันตรายและมาตรการควบคุม (JSA)</div>
        <div style={{ fontSize: 11.5, color: 'oklch(0.56 0.02 265)', marginBottom: 14 }}>รายการตามประเภทงานที่เลือก กำหนดโดยเจ้าหน้าที่ความปลอดภัย</div>
        <div style={{ display: 'grid', gridTemplateColumns: JSA_COLS, gap: 12, padding: '8px 0', borderBottom: `1px solid ${L.headBd}`, fontSize: 10.5, fontWeight: 600, letterSpacing: '0.06em', whiteSpace: 'nowrap', color: 'oklch(0.5 0.02 265)' }}>
          <div>อันตราย</div><div>มาตรการควบคุม</div><div>ระดับ</div>
        </div>
        <DataState loading={hazards.loading} error={hazards.error} count={hazardList.length} empty="ยังไม่มีรายการอันตรายสำหรับประเภทงานนี้" style={{ padding: '12px 0' }} />
        {hazardList.map((h) => (
          <div key={h.id} style={{ display: 'grid', gridTemplateColumns: JSA_COLS, gap: 12, padding: '11px 0', borderBottom: '1px solid oklch(0.96 0.008 265)', alignItems: 'center' }}>
            <div style={{ fontSize: 12.5, fontWeight: 500 }}>{h.hazard}</div>
            <div style={{ fontSize: 12, color: 'oklch(0.45 0.02 265)', lineHeight: 1.5 }}>{h.control}</div>
            <div><Pill t={riskTone(h.level)}>{h.level}</Pill></div>
          </div>
        ))}
        {hazardList.length > 0 && (
          <div style={{ marginTop: 14, padding: '12px 14px', borderRadius: 8, background: 'oklch(0.97 0.02 265)', border: '1px solid oklch(0.91 0.03 265)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
            <div style={{ fontSize: 12.5, fontWeight: 500 }}>ต้องควบคุมทั้งหมด {hazardList.length} รายการ</div>
            <div style={{ fontFamily: MONO, fontSize: 13, fontWeight: 600, color: tone(highCount ? 'bad' : 'ok').fg }}>ความเสี่ยงสูง {highCount} รายการ</div>
          </div>
        )}
      </Card>

      <Card style={{ padding: 18 }}>
        <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 3 }}>อุปกรณ์คุ้มครองความปลอดภัยส่วนบุคคล</div>
        <div style={{ fontSize: 11.5, color: 'oklch(0.56 0.02 265)', marginBottom: 12 }}>
          รายการที่บังคับจะติ๊กไว้และปลดไม่ได้ รายการอื่นเลือกเพิ่มตามลักษณะงานได้
        </div>
        <DataState loading={ppe.loading} error={ppe.error} count={ppeList.length} empty="ยังไม่มีรายการอุปกรณ์สำหรับประเภทงานนี้" style={{ padding: 0 }} />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: 8 }}>
          {ppeList.map((p) => {
            const checked = p.required || extraPpe.includes(p.label);
            return (
              <label
                key={p.id}
                className={p.required ? undefined : 'h-option'}
                style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '9px 10px', borderRadius: 7, cursor: p.required ? 'default' : 'pointer', border: `1px solid ${checked ? C.accBd : L.idle}`, background: checked ? C.accBg : '#fff' }}
              >
                <input type="checkbox" checked={checked} disabled={p.required} onChange={() => toggle(p.label)} />
                <span style={{ fontSize: 12, flex: 1 }}>{p.label}</span>
                {p.required && <span style={{ fontSize: 10, color: C.accFg, whiteSpace: 'nowrap' }}>บังคับ</span>}
              </label>
            );
          })}
          {customPpe.map((label) => (
            <label key={label} className="h-option" style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '9px 10px', borderRadius: 7, cursor: 'pointer', border: `1px solid ${C.accBd}`, background: C.accBg }}>
              <input type="checkbox" checked onChange={() => toggle(label)} />
              <span style={{ fontSize: 12, flex: 1 }}>{label}</span>
              <span style={{ fontSize: 10, color: C.mut, whiteSpace: 'nowrap' }}>เพิ่มเอง</span>
            </label>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
          <TextInput
            value={custom}
            onChange={(e) => setCustom(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                addCustom();
              }
            }}
            placeholder="เพิ่มอุปกรณ์อื่นสำหรับงานนี้"
          />
          <Button variant="outline" disabled={!custom.trim()} onClick={addCustom}>เพิ่ม</Button>
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
