import { useState, type FormEvent } from 'react';
import { notifyDataChanged } from '../hooks/useData';
import { supabase, type Course, type CourseQuestion } from '../lib/supabase';
import { C, L, MONO } from '../theme';
import { Button, Field, FormMessage, TextArea, TextInput } from './form';
import { Card } from './ui';
import { youTubeId } from './YouTubePlayer';

const OPTION_COUNT = 4;
const OPTION_KEYS = ['ก', 'ข', 'ค', 'ง'];

type QuestionDraft = { id?: string; question: string; options: string[]; correct_index: number };

const emptyQuestion = (): QuestionDraft => ({ question: '', options: Array(OPTION_COUNT).fill(''), correct_index: 0 });

export function CourseEditor({ course, questions, onClose }: { course: Course | null; questions: CourseQuestion[]; onClose: () => void }) {
  const [form, setForm] = useState({
    code: course?.code ?? '',
    name: course?.name ?? '',
    detail: course?.detail ?? '',
    video_url: course?.video_url ?? '',
    pass_score: String(course?.pass_score ?? 80),
    question_count: String(course?.question_count ?? 10),
    required: course?.required ?? false,
    active: course?.active ?? true,
  });
  const original = course ? questions.filter((q) => q.course_code === course.code).sort((a, b) => a.sort - b.sort) : [];
  const [drafts, setDrafts] = useState<QuestionDraft[]>(() =>
    original.length
      ? original.map((q) => ({ id: q.id, question: q.question, options: [...q.options, ...Array(OPTION_COUNT).fill('')].slice(0, OPTION_COUNT), correct_index: q.correct_index }))
      : [emptyQuestion()],
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const setDraft = (i: number, next: Partial<QuestionDraft>) => setDrafts(drafts.map((d, j) => (j === i ? { ...d, ...next } : d)));

  async function save(e: FormEvent) {
    e.preventDefault();
    if (!supabase) return;
    const url = form.video_url.trim();
    if (url && !youTubeId(url)) {
      setError('ลิงก์วิดีโอต้องเป็นลิงก์ YouTube เช่น https://youtu.be/xxxxxxxxxxx');
      return;
    }
    const filled = drafts.filter((d) => d.question.trim() || d.options.some((o) => o.trim()));
    const incomplete = filled.findIndex((d) => !d.question.trim() || d.options.some((o) => !o.trim()));
    if (incomplete >= 0) {
      setError(`ข้อสอบข้อที่ ${incomplete + 1} ยังกรอกคำถามหรือตัวเลือกไม่ครบ`);
      return;
    }

    const code = (course?.code ?? form.code).trim().toUpperCase();
    const fields = {
      name: form.name.trim(),
      detail: form.detail.trim(),
      video_url: url || null,
      pass_score: Number(form.pass_score),
      question_count: Number(form.question_count),
      required: form.required,
      active: form.active,
    };

    setSaving(true);
    setError(null);
    const fail = (message: string) => {
      setSaving(false);
      setError(message);
    };

    const { data: saved, error: courseErr } = course
      ? await supabase.from('courses').update(fields).eq('code', code).select('code')
      : await supabase.from('courses').insert({ code, ...fields, pass_rate: 0, taken: 0 }).select('code');
    if (courseErr) return fail(courseErr.code === '23505' ? 'รหัสหลักสูตรนี้มีอยู่แล้ว' : `บันทึกหลักสูตรไม่สำเร็จ: ${courseErr.message}`);
    if (!saved?.length) return fail('ไม่มีสิทธิ์บันทึกหลักสูตร');

    const keptIds = new Set(filled.map((d) => d.id).filter(Boolean));
    const removed = original.filter((q) => !keptIds.has(q.id)).map((q) => q.id);
    if (removed.length) {
      const { error: delErr } = await supabase.from('course_questions').delete().in('id', removed);
      if (delErr) return fail(`ลบข้อสอบไม่สำเร็จ: ${delErr.message}`);
    }

    const rows = filled.map((d, i) => ({
      id: d.id,
      course_code: code,
      question: d.question.trim(),
      options: d.options.map((o) => o.trim()),
      correct_index: d.correct_index,
      sort: i,
    }));
    for (const { id, ...row } of rows.filter((r) => r.id)) {
      const { error: updErr } = await supabase.from('course_questions').update(row).eq('id', id!);
      if (updErr) return fail(`บันทึกข้อสอบไม่สำเร็จ: ${updErr.message}`);
    }
    const inserts = rows.filter((r) => !r.id).map(({ id: _id, ...row }) => row);
    if (inserts.length) {
      const { error: insErr } = await supabase.from('course_questions').insert(inserts);
      if (insErr) return fail(`บันทึกข้อสอบไม่สำเร็จ: ${insErr.message}`);
    }

    setSaving(false);
    notifyDataChanged();
    onClose();
  }

  return (
    <Card style={{ padding: 18 }}>
      <form onSubmit={save}>
        <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 14 }}>{course ? `แก้ไขหลักสูตร ${course.code}` : 'เพิ่มหลักสูตร'}</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14 }}>
          <Field label="รหัสหลักสูตร">
            <TextInput required disabled={!!course} value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} placeholder="TR-101" />
          </Field>
          <Field label="ชื่อหลักสูตร"><TextInput required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field>
          <Field label="รายละเอียด" wide><TextInput required value={form.detail} onChange={(e) => setForm({ ...form, detail: e.target.value })} placeholder="บังคับทุกคนก่อนเข้าพื้นที่ — อายุใบรับรอง 1 ปี" /></Field>
          <Field label="ลิงก์วิดีโอ YouTube (ตั้งเป็น Unlisted ได้)" wide>
            <TextInput value={form.video_url} onChange={(e) => setForm({ ...form, video_url: e.target.value })} placeholder="https://youtu.be/xxxxxxxxxxx — เว้นว่างถ้าไม่มีวิดีโอ" />
          </Field>
          <Field label="เกณฑ์ผ่าน (%)">
            <TextInput required type="number" min={1} max={100} value={form.pass_score} onChange={(e) => setForm({ ...form, pass_score: e.target.value })} />
          </Field>
          <Field label="จำนวนข้อที่สุ่มออกสอบ">
            <TextInput required type="number" min={1} max={100} value={form.question_count} onChange={(e) => setForm({ ...form, question_count: e.target.value })} />
          </Field>
        </div>
        <div style={{ display: 'flex', gap: 20, marginTop: 14, fontSize: 12.5, flexWrap: 'wrap' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 7, cursor: 'pointer' }}>
            <input type="checkbox" checked={form.required} onChange={(e) => setForm({ ...form, required: e.target.checked })} />
            บังคับทุกคนก่อนออกบัตร
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: 7, cursor: 'pointer' }}>
            <input type="checkbox" checked={form.active} onChange={(e) => setForm({ ...form, active: e.target.checked })} />
            เปิดใช้งาน
          </label>
        </div>

        <div style={{ marginTop: 20, paddingTop: 14, borderTop: `1px solid ${L.headBd}` }}>
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: 12 }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 600 }}>คลังข้อสอบ ({drafts.length} ข้อ)</div>
              <div style={{ fontSize: 11.5, color: 'oklch(0.56 0.02 265)' }}>ระบบจะสุ่มออกสอบ {form.question_count || '—'} ข้อจากคลังนี้ เลือกวงกลมหน้าคำตอบที่ถูก</div>
            </div>
            <Button variant="outline" onClick={() => setDrafts([...drafts, emptyQuestion()])}>+ เพิ่มข้อสอบ</Button>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {drafts.map((d, i) => (
              <div key={d.id ?? `new-${i}`} style={{ padding: 12, borderRadius: 8, border: `1px solid ${L.idle}`, background: 'oklch(0.99 0.003 265)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                  <div style={{ fontFamily: MONO, fontSize: 11.5, fontWeight: 600, color: C.accFg }}>ข้อ {i + 1}</div>
                  <div style={{ flex: 1 }} />
                  <Button variant="outline" onClick={() => setDrafts(drafts.filter((_, j) => j !== i))} style={{ padding: '4px 10px', fontSize: 11.5 }}>ลบ</Button>
                </div>
                <TextArea rows={2} value={d.question} onChange={(e) => setDraft(i, { question: e.target.value })} placeholder="คำถาม" aria-label={`คำถามข้อ ${i + 1}`} />
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 8, marginTop: 8 }}>
                  {d.options.map((option, k) => (
                    <label key={k} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <input
                        type="radio"
                        name={`correct-${i}`}
                        checked={d.correct_index === k}
                        onChange={() => setDraft(i, { correct_index: k })}
                        aria-label={`ตัวเลือก ${OPTION_KEYS[k]} เป็นคำตอบที่ถูก`}
                      />
                      <span style={{ fontFamily: MONO, fontSize: 11.5, width: 14 }}>{OPTION_KEYS[k]}</span>
                      <TextInput
                        value={option}
                        onChange={(e) => setDraft(i, { options: d.options.map((o, m) => (m === k ? e.target.value : o)) })}
                        placeholder={`ตัวเลือก ${OPTION_KEYS[k]}`}
                        style={{ borderColor: d.correct_index === k ? C.grn : undefined }}
                      />
                    </label>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {error && <FormMessage error style={{ marginTop: 12 }}>{error}</FormMessage>}
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 16 }}>
          <Button variant="outline" onClick={onClose}>ยกเลิก</Button>
          <Button type="submit" disabled={saving}>{saving ? 'กำลังบันทึก...' : 'บันทึกหลักสูตรและข้อสอบ'}</Button>
        </div>
      </form>
    </Card>
  );
}
