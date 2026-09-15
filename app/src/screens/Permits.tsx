import { Card, CheckItem, Pill, PrimaryButton, TableHead, TableRow, ellipsis } from '../components/ui';
import { APPROVALS, ATTACHMENTS, DRAFT_PERMIT_NO, FORM_FIELDS, HAZARDS, PERMIT_TYPES, PERMIT_WORKERS, PPE, STEPS } from '../data';
import { C, L, MONO, tone } from '../theme';

type Props = { step: number; onStep: (n: number) => void; permitType: number; onPermitType: (i: number) => void };

const twoCol = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 16, alignItems: 'start' } as const;

export function Permits({ step, onStep, permitType, onPermitType }: Props) {
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
      {step === 2 && <StepDetails />}
      {step === 3 && <StepRisk />}
      {step === 4 && <StepApproval />}

      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div onClick={() => onStep(Math.max(1, step - 1))} className="h-outline" style={{ padding: '9px 16px', borderRadius: 8, border: '1px solid oklch(0.9 0.01 265)', background: '#fff', fontSize: 12.5, cursor: 'pointer' }}>ย้อนกลับ</div>
        <div onClick={() => onStep(Math.min(STEPS.length, step + 1))} className="h-dark" style={{ padding: '9px 18px', borderRadius: 8, background: L.navy, color: '#fff', fontSize: 12.5, fontWeight: 500, cursor: 'pointer' }}>ขั้นตอนต่อไป</div>
        <div style={{ fontSize: 11.5, color: 'oklch(0.58 0.02 265)' }}>
          บันทึกฉบับร่างอัตโนมัติ — <span style={{ fontFamily: MONO }}>{DRAFT_PERMIT_NO}</span>
        </div>
      </div>
    </div>
  );
}

function StepType({ selected, onSelect }: { selected: number; onSelect: (i: number) => void }) {
  return (
    <Card style={{ padding: 18 }}>
      <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 3 }}>เลือกประเภทงานที่ขออนุญาต</div>
      <div style={{ fontSize: 11.5, color: 'oklch(0.56 0.02 265)', marginBottom: 16 }}>เลือกได้มากกว่าหนึ่งประเภท ระบบจะรวมแบบฟอร์มควบคุมให้อัตโนมัติ</div>
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

function StepDetails() {
  return (
    <div style={twoCol}>
      <Card style={{ padding: 18 }}>
        <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 16 }}>รายละเอียดงาน</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 14 }}>
          {FORM_FIELDS.map((f) => (
            <div key={f.label} style={{ gridColumn: f.wide ? 'span 2' : 'span 1' }}>
              <div style={{ fontSize: 11.5, fontWeight: 500, color: 'oklch(0.42 0.02 265)', marginBottom: 5 }}>{f.label}</div>
              <div style={{ border: '1px solid oklch(0.9 0.01 265)', borderRadius: 7, padding: '9px 11px', fontSize: 12.5, background: 'oklch(0.99 0.003 265)', color: 'oklch(0.35 0.02 265)', minHeight: 19, whiteSpace: 'pre-wrap' }}>{f.value}</div>
            </div>
          ))}
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
        <div style={{ marginTop: 14, padding: '12px 14px', borderRadius: 8, background: 'oklch(0.97 0.02 265)', border: '1px solid oklch(0.91 0.03 265)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ fontSize: 12.5, fontWeight: 500 }}>คะแนนความเสี่ยงรวมหลังมาตรการควบคุม</div>
            <div style={{ fontFamily: MONO, fontSize: 15, fontWeight: 600, color: 'oklch(0.45 0.12 70)' }}>12 — ปานกลาง</div>
          </div>
        </div>
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

function StepApproval() {
  return (
    <div style={twoCol}>
      <Card style={{ overflowX: 'auto' }}>
        <div style={{ padding: '14px 18px', borderBottom: `1px solid ${L.headBd}` }}>
          <div style={{ fontSize: 14, fontWeight: 600 }}>ผู้ปฏิบัติงานในใบอนุญาต</div>
          <div style={{ fontSize: 11.5, color: 'oklch(0.56 0.02 265)' }}>ระบบตรวจสอบบัตรและผลอบรมอัตโนมัติ</div>
        </div>
        <TableHead columns={WORKER_COLS} minWidth={620} labels={['ชื่อ', 'เลขบัตร', 'หลักสูตรที่ผ่าน', 'ผลตรวจสอบ']} />
        {PERMIT_WORKERS.map((w) => (
          <TableRow key={w.card} columns={WORKER_COLS} minWidth={620} hover={false}>
            <div style={{ fontSize: 12.5, fontWeight: 500, ...ellipsis }}>{w.name}</div>
            <div style={{ fontFamily: MONO, fontSize: 11.5, color: 'oklch(0.5 0.02 265)' }}>{w.card}</div>
            <div style={{ fontSize: 11.5, color: 'oklch(0.48 0.02 265)', ...ellipsis }}>{w.courses}</div>
            <div><Pill t={w.tone}>{w.status}</Pill></div>
          </TableRow>
        ))}
      </Card>

      <Card style={{ padding: 18, position: 'sticky', top: 88 }}>
        <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 14 }}>ลำดับการอนุมัติ</div>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {APPROVALS.map((a, i) => {
            const t = tone(a.tone), last = i === APPROVALS.length - 1;
            return (
              <div key={a.role} style={{ display: 'flex', gap: 12 }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: '0 0 22px' }}>
                  <div style={{ width: 22, height: 22, borderRadius: '50%', background: a.tone === 'ok' ? C.grn : a.tone === 'warn' ? C.amb : '#fff', border: `2px solid ${a.tone === 'flat' ? 'oklch(0.88 0.01 265)' : t.accent}`, color: a.tone === 'flat' ? C.mut : '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700 }}>
                    {a.tone === 'ok' ? '✓' : a.tone === 'warn' ? '!' : i + 1}
                  </div>
                  <div style={{ width: 2, flex: 1, background: last ? 'transparent' : L.idle, minHeight: last ? 0 : 18 }} />
                </div>
                <div style={{ paddingBottom: 16, flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12.5, fontWeight: 600 }}>{a.role}</div>
                  <div style={{ fontSize: 11.5, color: 'oklch(0.5 0.02 265)' }}>{a.person}</div>
                  <div style={{ fontFamily: MONO, fontSize: 10.5, color: t.fg, marginTop: 3 }}>{a.time}</div>
                </div>
              </div>
            );
          })}
        </div>
        <div style={{ padding: '10px 12px', borderRadius: 8, background: 'oklch(0.985 0.004 265)', border: `1px solid ${L.headBd}`, fontSize: 11.5, color: 'oklch(0.48 0.02 265)', lineHeight: 1.55, marginBottom: 12 }}>
          ใบอนุญาตมีผล 12 ชม. นับจากเวลาอนุมัติ และต้องปิดงานพร้อมตรวจพื้นที่ก่อนหมดอายุ
        </div>
        <PrimaryButton style={{ textAlign: 'center', padding: 10, borderRadius: 8, fontSize: 13 }}>ส่งขออนุมัติ</PrimaryButton>
      </Card>
    </div>
  );
}
