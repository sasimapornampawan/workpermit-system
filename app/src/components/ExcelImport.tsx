import { useEffect, useState, type ChangeEvent } from 'react';
import { useProfile } from '../hooks/useAuth';
import { notifyDataChanged } from '../hooks/useData';
import { BADGE_KINDS, BADGE_TIERS, supabase, type Contractor } from '../lib/supabase';
import { C, L, MONO, tone } from '../theme';
import { Button, FormMessage } from './form';
import { Card } from './ui';

// Sheet and column names come from public/import-template.xlsx.
const CONTRACTOR_SHEET = 'ผู้รับเหมา';
const BADGE_SHEET = 'พนักงาน (บัตร)';
const EXAMPLE_VALUES = ['บจก. ตัวอย่าง เอ็นจิเนียริ่ง', 'นายสมศักดิ์ ตัวอย่าง'];

const CONTRACTOR_STATUS: Record<string, string> = { 'ใช้งานได้': 'ok', 'เฝ้าระวัง': 'warn', 'ระงับ': 'bad' };
const TRAINING_STATUS: Record<string, string> = { 'ผ่านครบ': 'ok', 'ผ่านบางส่วน': 'warn', 'หมดอายุ': 'bad' };
const BADGE_STATUS: Record<string, string> = {
  'พร้อมออกบัตร': 'ready', 'รออบรมเพิ่ม': 'pending_training', 'รอเอกสาร': 'pending_docs', 'ออกบัตรแล้ว': 'issued', 'ตีกลับ': 'rejected',
};

type RowError = { sheet: string; row: number; message: string };
type ContractorRow = {
  code: string; name: string; initials: string; scope: string; workers: number; insurance: string; status: string; safety_score: number | null;
};
type BadgeRow = {
  name: string; id_no: string | null; company: string; role: string | null; kind: string; tier: string; card_no: string | null;
  expiry: string | null; perms: string[]; training: string; training_status: string; status: string;
};
type Parsed = { contractors: ContractorRow[]; badges: BadgeRow[]; errors: RowError[]; newCodes: number };

function cellText(value: unknown): string {
  if (value === null || value === undefined) return '';
  if (value instanceof Date) return value.toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' });
  return String(value).trim();
}

type SheetRecord = { row: number; get: (header: string) => string };

/** Rows keyed by header text (the trailing "*" of required columns is ignored); blank and example rows are skipped. */
function toRecords(rows: unknown[][]): SheetRecord[] {
  const headers = (rows[0] ?? []).map((h) => cellText(h).replace(/\s*\*\s*$/, ''));
  const records: SheetRecord[] = [];
  rows.slice(1).forEach((cells, i) => {
    const values = headers.map((_, idx) => cellText(cells[idx]));
    if (values.every((v) => !v) || values.some((v) => EXAMPLE_VALUES.includes(v))) return;
    records.push({ row: i + 2, get: (header) => values[headers.indexOf(header)] ?? '' });
  });
  return records;
}

export async function parseWorkbook(file: File, existing: Contractor[]): Promise<Parsed> {
  const { default: readXlsxFile, readSheetNames } = await import('read-excel-file');
  const sheets = await readSheetNames(file);
  if (!sheets.includes(CONTRACTOR_SHEET) && !sheets.includes(BADGE_SHEET)) {
    throw new Error(`ไม่พบแท็บ "${CONTRACTOR_SHEET}" หรือ "${BADGE_SHEET}" — กรุณาใช้ไฟล์แม่แบบของระบบ`);
  }

  const errors: RowError[] = [];
  const contractors: ContractorRow[] = [];
  const nameByCode = new Map(existing.map((c) => [c.code, c.name]));
  const existingCodes = new Set(existing.map((c) => c.code));

  if (sheets.includes(CONTRACTOR_SHEET)) {
    const seen = new Set<string>();
    for (const r of toRecords(await readXlsxFile(file, { sheet: CONTRACTOR_SHEET }))) {
      const fail = (message: string) => errors.push({ sheet: CONTRACTOR_SHEET, row: r.row, message });
      const code = r.get('รหัสผู้รับเหมา').toUpperCase();
      const name = r.get('ชื่อบริษัท');
      const workers = Number(r.get('จำนวนพนักงาน'));
      const status = CONTRACTOR_STATUS[r.get('สถานะ')];
      const scoreText = r.get('คะแนนความปลอดภัย (0–100)');
      const score = scoreText === '' ? null : Number(scoreText);

      const missing = [!code && 'รหัสผู้รับเหมา', !name && 'ชื่อบริษัท', !r.get('อักษรย่อ (2–3 ตัว)') && 'อักษรย่อ', !r.get('ประเภทงาน') && 'ประเภทงาน', !r.get('ประกันภัยหมดอายุ') && 'ประกันภัยหมดอายุ']
        .filter(Boolean);
      if (missing.length) { fail(`ยังไม่ได้กรอก ${missing.join(', ')}`); continue; }
      if (seen.has(code)) { fail(`รหัส ${code} ซ้ำกับแถวก่อนหน้าในไฟล์`); continue; }
      if (!Number.isInteger(workers) || workers < 0) { fail('จำนวนพนักงานต้องเป็นตัวเลขจำนวนเต็ม'); continue; }
      if (!status) { fail('สถานะต้องเป็น ใช้งานได้ / เฝ้าระวัง / ระงับ'); continue; }
      if (score !== null && (!Number.isInteger(score) || score < 0 || score > 100)) { fail('คะแนนความปลอดภัยต้องเป็นตัวเลข 0–100'); continue; }

      seen.add(code);
      nameByCode.set(code, name);
      contractors.push({
        code, name, initials: r.get('อักษรย่อ (2–3 ตัว)').toUpperCase().slice(0, 3), scope: r.get('ประเภทงาน'),
        workers, insurance: r.get('ประกันภัยหมดอายุ'), status, safety_score: score,
      });
    }
  }

  const badges: BadgeRow[] = [];
  if (sheets.includes(BADGE_SHEET)) {
    const seenCards = new Set<string>();
    for (const r of toRecords(await readXlsxFile(file, { sheet: BADGE_SHEET }))) {
      const fail = (message: string) => errors.push({ sheet: BADGE_SHEET, row: r.row, message });
      const name = r.get('ชื่อ-สกุล');
      const code = r.get('รหัสผู้รับเหมา').toUpperCase();
      const company = nameByCode.get(code);
      const kind = r.get('ประเภทผู้ปฏิบัติงาน');
      const tier = r.get('ระดับบัตร');
      const cardNo = r.get('เลขที่บัตร') || null;
      const trainingStatus = TRAINING_STATUS[r.get('สถานะผลอบรม')];
      const status = BADGE_STATUS[r.get('สถานะคำขอบัตร')];

      if (!name) { fail('ยังไม่ได้กรอกชื่อ-สกุล'); continue; }
      if (!company) { fail(`ไม่พบรหัสผู้รับเหมา "${code || '(ว่าง)'}" ในระบบหรือในแท็บ ${CONTRACTOR_SHEET}`); continue; }
      if (!BADGE_KINDS.includes(kind)) { fail(`ประเภทผู้ปฏิบัติงานต้องเป็น ${BADGE_KINDS.join(' / ')}`); continue; }
      if (!BADGE_TIERS.includes(tier)) { fail(`ระดับบัตรต้องเป็น ${BADGE_TIERS.join(' / ')}`); continue; }
      if (!trainingStatus) { fail('สถานะผลอบรมต้องเป็น ผ่านครบ / ผ่านบางส่วน / หมดอายุ'); continue; }
      if (!status) { fail('สถานะคำขอบัตรไม่ถูกต้อง'); continue; }
      if (cardNo && seenCards.has(cardNo)) { fail(`เลขที่บัตร ${cardNo} ซ้ำกับแถวก่อนหน้าในไฟล์`); continue; }
      if (cardNo) seenCards.add(cardNo);

      badges.push({
        name, id_no: r.get('เลขบัตรประชาชน') || null, company, role: r.get('ตำแหน่ง / หน้าที่') || null, kind, tier, card_no: cardNo,
        expiry: r.get('วันหมดอายุบัตร') || null,
        perms: r.get('สิทธิ์การเข้าทำงาน (คั่นด้วย ,)').split(',').map((p) => p.trim()).filter(Boolean),
        training: r.get('ผลการอบรม') || 'รอตรวจสอบ', training_status: trainingStatus, status,
      });
    }
  }

  return { contractors, badges, errors, newCodes: contractors.filter((c) => !existingCodes.has(c.code)).length };
}

/** Returns a summary on success; throws with a readable message on failure. */
async function importParsed(parsed: Parsed, issuedBy: string): Promise<string> {
  if (!supabase) throw new Error('ยังไม่ได้ตั้งค่า Supabase');

  if (parsed.contractors.length) {
    const { error } = await supabase
      .from('contractors')
      .upsert(parsed.contractors.map((c) => ({ ...c, cards: `0 / ${c.workers}` })), { onConflict: 'code' });
    if (error) throw new Error(error.code === '23505' ? `ชื่อบริษัทซ้ำกับผู้รับเหมาที่มีรหัสอื่นในระบบ (${error.message})` : `นำเข้าผู้รับเหมาไม่สำเร็จ: ${error.message}`);
  }

  // New badges cannot be inserted as issued, so issued ones go in as ready and are issued right after.
  const toPayload = <T extends { status: string }>(b: T) => ({ ...b, status: b.status === 'issued' ? 'ready' : b.status });
  const issuedIds: string[] = [];
  const withCard = parsed.badges.filter((b) => b.card_no);
  const withoutCard = parsed.badges.filter((b) => !b.card_no).map(({ card_no: _unused, ...b }) => b);

  if (withCard.length) {
    const { data, error } = await supabase.from('badges').upsert(withCard.map(toPayload), { onConflict: 'card_no' }).select('id, card_no');
    if (error) throw new Error(`นำเข้าพนักงานไม่สำเร็จ: ${error.message}`);
    const issuedCards = new Set(withCard.filter((b) => b.status === 'issued').map((b) => b.card_no));
    issuedIds.push(...(data ?? []).filter((row) => issuedCards.has(row.card_no)).map((row) => row.id as string));
  }
  if (withoutCard.length) {
    // card_no is left out entirely so the database default assigns the next card number.
    const { data, error } = await supabase.from('badges').insert(withoutCard.map(toPayload)).select('id');
    if (error) throw new Error(`นำเข้าพนักงานไม่สำเร็จ: ${error.message}`);
    // PostgREST returns inserted rows in input order.
    (data ?? []).forEach((row, i) => withoutCard[i].status === 'issued' && issuedIds.push(row.id as string));
  }
  if (issuedIds.length) {
    const { error } = await supabase
      .from('badges')
      .update({ status: 'issued', issued_at: new Date().toISOString(), issued_by: issuedBy })
      .in('id', issuedIds);
    if (error) throw new Error(`นำเข้าแล้ว แต่ตั้งสถานะ "ออกบัตรแล้ว" ไม่สำเร็จ: ${error.message}`);
  }

  return `นำเข้าแล้ว — ผู้รับเหมา ${parsed.contractors.length} บริษัท (ใหม่ ${parsed.newCodes}, อัปเดต ${parsed.contractors.length - parsed.newCodes}) · พนักงาน ${parsed.badges.length} คน`;
}

export function ImportButton({ onFile }: { onFile: (file: File) => void }) {
  function change(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (file) onFile(file);
  }
  return (
    <label className="h-outline" style={{ padding: '6px 12px', borderRadius: 7, fontSize: 12, border: '1px solid oklch(0.9 0.01 265)', cursor: 'pointer', whiteSpace: 'nowrap', background: '#fff' }}>
      นำเข้าไฟล์ Excel
      <input type="file" accept=".xlsx" onChange={change} style={{ display: 'none' }} />
    </label>
  );
}

export function ImportPanel({ file, contractors, onClose }: { file: File; contractors: Contractor[]; onClose: () => void }) {
  const profile = useProfile();
  const [parsed, setParsed] = useState<Parsed | null>(null);
  const [problem, setProblem] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<string | null>(null);

  // Parse once per chosen file; the contractor list only resolves codes and is not a reason to re-read.
  useEffect(() => {
    parseWorkbook(file, contractors)
      .then(setParsed)
      .catch((e: unknown) => setProblem(e instanceof Error ? e.message : 'อ่านไฟล์ไม่สำเร็จ'));
  }, [file]);

  async function run() {
    if (!parsed) return;
    setBusy(true);
    setProblem(null);
    try {
      setDone(await importParsed(parsed, profile.id));
      notifyDataChanged();
    } catch (e) {
      setProblem(e instanceof Error ? e.message : 'นำเข้าไม่สำเร็จ');
    }
    setBusy(false);
  }

  const total = parsed ? parsed.contractors.length + parsed.badges.length : 0;

  return (
    <Card style={{ padding: 18 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 600 }}>นำเข้าข้อมูลจาก Excel</div>
          <div style={{ fontFamily: MONO, fontSize: 11, color: C.mut }}>{file.name}</div>
        </div>
        <Button variant="outline" onClick={onClose} style={{ padding: '5px 11px', fontSize: 12 }}>{done ? 'ปิด' : 'ยกเลิก'}</Button>
      </div>

      {!parsed && !problem && <div style={{ fontSize: 12.5, color: C.mut }}>กำลังอ่านไฟล์...</div>}

      {parsed && !done && (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 10, marginBottom: 12 }}>
            <Summary label="ผู้รับเหมาที่พร้อมนำเข้า" value={parsed.contractors.length} note={`ใหม่ ${parsed.newCodes} · อัปเดต ${parsed.contractors.length - parsed.newCodes}`} />
            <Summary label="พนักงานที่พร้อมนำเข้า" value={parsed.badges.length} note="เป็นคำขอบัตรในเมนูบัตรผู้รับเหมา" />
            <Summary label="แถวที่มีปัญหา" value={parsed.errors.length} note={parsed.errors.length ? 'แถวเหล่านี้จะไม่ถูกนำเข้า' : 'ไม่มี'} bad={parsed.errors.length > 0} />
          </div>
          {parsed.errors.length > 0 && (
            <div style={{ maxHeight: 220, overflowY: 'auto', border: `1px solid ${tone('bad').bd}`, borderRadius: 8, background: tone('bad').bg, padding: '8px 12px', marginBottom: 12 }}>
              {parsed.errors.map((e, i) => (
                <div key={i} style={{ fontSize: 12, color: tone('bad').fg, padding: '3px 0' }}>
                  แท็บ {e.sheet} แถว {e.row}: {e.message}
                </div>
              ))}
            </div>
          )}
          {total === 0 && <FormMessage error>ไม่มีแถวที่นำเข้าได้ ตรวจสอบว่ากรอกข้อมูลในแถวที่ 3 เป็นต้นไป</FormMessage>}
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 12 }}>
            <Button disabled={busy || total === 0} onClick={run}>{busy ? 'กำลังนำเข้า...' : `นำเข้า ${total} รายการ`}</Button>
          </div>
        </>
      )}

      {done && <FormMessage error={false}>{done}</FormMessage>}
      {problem && <FormMessage error style={{ marginTop: 8 }}>{problem}</FormMessage>}
    </Card>
  );
}

function Summary({ label, value, note, bad }: { label: string; value: number; note: string; bad?: boolean }) {
  return (
    <div style={{ padding: '10px 12px', borderRadius: 8, border: `1px solid ${L.idle}`, background: '#fff' }}>
      <div style={{ fontSize: 11.5, color: C.mut }}>{label}</div>
      <div style={{ fontFamily: MONO, fontSize: 22, fontWeight: 500, color: bad ? tone('bad').fg : undefined }}>{value}</div>
      <div style={{ fontSize: 11, color: C.mut }}>{note}</div>
    </div>
  );
}
