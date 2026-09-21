import { useState } from 'react';
import { CourseEditor } from '../components/CourseEditor';
import { ExamRunner } from '../components/ExamRunner';
import { Button, FormMessage } from '../components/form';
import { Bar, Card, CardTitle, DataState, Pill, TableHead, TableRow, ellipsis } from '../components/ui';
import { useProfile } from '../hooks/useAuth';
import { notifyDataChanged, useBadges, useCourseQuestions, useCourses, useExamResults } from '../hooks/useData';
import { countBy, localDate } from '../lib/stats';
import { examResult, supabase, type Course } from '../lib/supabase';
import { C, L, MONO, tone } from '../theme';

const COLS = 'minmax(0, 1.3fr) minmax(0, 1.2fr) 100px 72px 96px';

const rateColor = (rate: number) => (rate >= 90 ? C.grn : rate >= 80 ? C.acc : C.amb);

export function Training() {
  const profile = useProfile();
  const courses = useCourses();
  const exams = useExamResults();
  const badges = useBadges();
  const questions = useCourseQuestions();
  const [selectedCode, setSelectedCode] = useState<string | null>(null);
  const [editing, setEditing] = useState<Course | 'new' | null>(null);
  const [message, setMessage] = useState<{ error: boolean; text: string } | null>(null);

  async function setActive(course: Course, active: boolean) {
    if (!supabase) return;
    if (!active && !window.confirm(`ยกเลิกหลักสูตร ${course.name}?\nผู้รับเหมาจะไม่เห็นหลักสูตรนี้ ผลสอบเดิมยังเก็บไว้ และเปิดใช้งานอีกครั้งได้`)) return;
    setMessage(null);
    const { data: rows, error } = await supabase.from('courses').update({ active }).eq('code', course.code).select('code');
    if (error || !rows?.length) {
      setMessage({ error: true, text: `บันทึกไม่สำเร็จ: ${error?.message ?? 'ไม่มีสิทธิ์แก้ไขหลักสูตรนี้'}` });
      return;
    }
    setMessage({ error: false, text: `${active ? 'เปิดใช้งาน' : 'ยกเลิก'}หลักสูตร ${course.name} แล้ว` });
    notifyDataChanged();
  }

  const isSafety = profile.role === 'safety';
  const canRunExam = isSafety || profile.role === 'contractor';
  const courseList = courses.data.filter((c) => isSafety || c.active).sort((a, b) => a.code.localeCompare(b.code));
  const selected = courseList.find((c) => c.code === selectedCode && c.active) ?? courseList.find((c) => c.active);
  const examList = [...exams.data].sort((a, b) => b.taken_on.localeCompare(a.taken_on));
  const takenByCourse = countBy(exams.data, (e) => e.course_code);
  const passedByCourse = countBy(exams.data.filter((e) => e.result === 'pass'), (e) => e.course_code);
  const questionsByCourse = countBy(questions.data, (q) => q.course_code);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {isSafety && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ flex: 1, fontSize: 12, color: 'oklch(0.5 0.02 265)' }}>คลิกหลักสูตรเพื่อเลือกจัดสอบ หรือกด "แก้ไข" เพื่อจัดการวิดีโอและข้อสอบ</div>
          <Button disabled={editing === 'new'} onClick={() => setEditing('new')} style={{ padding: '6px 12px', fontSize: 12 }}>+ เพิ่มหลักสูตร</Button>
        </div>
      )}

      {editing && (
        <CourseEditor
          key={editing === 'new' ? 'new' : editing.code}
          course={editing === 'new' ? null : editing}
          questions={questions.data}
          taken={editing === 'new' ? 0 : takenByCourse.get(editing.code) ?? 0}
          onClose={() => setEditing(null)}
        />
      )}

      {message && <FormMessage error={message.error}>{message.text}</FormMessage>}

      <DataState loading={courses.loading} error={courses.error} count={courseList.length} style={{ padding: 0 }} />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(215px, 1fr))', gap: 12 }}>
        {courseList.map((c) => {
          const taken = takenByCourse.get(c.code) ?? 0;
          const rate = taken ? Math.round(((passedByCourse.get(c.code) ?? 0) / taken) * 100) : null;
          const on = c.code === selected?.code;
          return (
            <Card
              key={c.code}
              className={c.active ? 'h-type' : undefined}
              style={{ padding: '14px 15px', display: 'flex', flexDirection: 'column', gap: 10, cursor: c.active ? 'pointer' : 'default', opacity: c.active ? 1 : 0.6, borderColor: on ? C.accBd : undefined, background: on ? C.accBg : '#fff' }}
            >
              <div onClick={() => c.active && setSelectedCode(c.code)} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, lineHeight: 1.35 }}>{c.name}</div>
                  <div style={{ fontFamily: MONO, fontSize: 10, padding: '2px 6px', borderRadius: 4, background: 'oklch(0.96 0.01 265)', color: 'oklch(0.45 0.02 265)', whiteSpace: 'nowrap' }}>{c.code}</div>
                </div>
                <div style={{ fontSize: 11.5, color: 'oklch(0.52 0.02 265)' }}>{c.detail}</div>
                <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                  {c.required && <Pill t="info" style={{ fontSize: 10.5 }}>บังคับทุกคน</Pill>}
                  {!c.active && <Pill t="flat" style={{ fontSize: 10.5 }}>ปิดใช้งาน</Pill>}
                  {!c.video_url && <Pill t="warn" style={{ fontSize: 10.5 }}>ยังไม่มีวิดีโอ</Pill>}
                  {isSafety && <Pill t={questionsByCourse.get(c.code) ? 'flat' : 'bad'} style={{ fontSize: 10.5 }}>ข้อสอบ {questionsByCourse.get(c.code) ?? 0} ข้อ</Pill>}
                </div>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 11, color: 'oklch(0.5 0.02 265)', marginBottom: 5 }}>
                    <span>อัตราผ่าน</span>
                    <span style={{ fontFamily: MONO, color: 'oklch(0.3 0.02 265)', fontWeight: 500 }}>{rate === null ? '—' : `${rate}%`}</span>
                  </div>
                  <Bar pct={`${rate ?? 0}%`} color={rateColor(rate ?? 0)} height={7} radius={4} />
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 11, color: 'oklch(0.55 0.02 265)', borderTop: `1px solid ${L.rowBd}`, paddingTop: 9 }}>
                <span>สอบแล้ว {taken} ครั้ง · เกณฑ์ {c.pass_score}%</span>
                {isSafety && (
                  <span style={{ display: 'flex', gap: 10 }}>
                    <span
                      onClick={() => setActive(c, !c.active)}
                      className="h-underline"
                      style={{ color: c.active ? tone('bad').fg : tone('ok').fg, fontWeight: 500, cursor: 'pointer' }}
                    >
                      {c.active ? 'ยกเลิกหลักสูตร' : 'เปิดใช้งาน'}
                    </span>
                    <span onClick={() => setEditing(c)} className="h-underline" style={{ color: 'oklch(0.45 0.12 265)', fontWeight: 500, cursor: 'pointer' }}>แก้ไข</span>
                  </span>
                )}
              </div>
            </Card>
          );
        })}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(330px, 1fr))', gap: 16, alignItems: 'start' }}>
        <Card style={{ overflowX: 'auto' }}>
          <div style={{ padding: '13px 18px', borderBottom: `1px solid ${L.headBd}` }}>
            <CardTitle title="ผลการทดสอบล่าสุด" sub="บันทึกอัตโนมัติเมื่อส่งคำตอบ" />
          </div>
          <TableHead columns={COLS} minWidth={680} labels={['ผู้เข้าทดสอบ', 'หลักสูตร', 'วันที่', 'คะแนน', 'ผล']} />
          <DataState loading={exams.loading} error={exams.error} count={examList.length} />
          {examList.map((e) => {
            const [resultLabel, resultTone] = examResult(e.result);
            return (
              <TableRow key={e.id} columns={COLS} minWidth={680}>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 12.5, fontWeight: 500, ...ellipsis }}>{e.name}</div>
                  <div style={{ fontSize: 10.5, color: 'oklch(0.58 0.02 265)' }}>{e.company}</div>
                </div>
                <div style={{ fontSize: 12, color: 'oklch(0.45 0.02 265)', ...ellipsis }}>{e.courses ? `${e.courses.name} (${e.course_code})` : e.course_code}</div>
                <div style={{ fontFamily: MONO, fontSize: 11.5, color: 'oklch(0.5 0.02 265)' }}>{localDate(e.taken_on).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' })}</div>
                <div style={{ fontFamily: MONO, fontSize: 12.5, fontWeight: 500, color: tone(resultTone).fg }}>{e.score}%</div>
                <div><Pill t={resultTone}>{resultLabel}</Pill></div>
              </TableRow>
            );
          })}
        </Card>

        {canRunExam && selected ? (
          <ExamRunner course={selected} badges={badges.data} />
        ) : (
          <Card style={{ padding: '16px 18px', fontSize: 12.5, color: 'oklch(0.5 0.02 265)' }}>
            {canRunExam ? 'ยังไม่มีหลักสูตรที่เปิดใช้งาน' : 'การจัดสอบทำโดย จป. หรือหัวหน้างานผู้รับเหมา'}
          </Card>
        )}
      </div>
    </div>
  );
}
