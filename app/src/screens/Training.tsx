import { Bar, Card, CardTitle, DataState, OutlineButton, Pill, PrimaryButton, TableHead, TableRow, ellipsis } from '../components/ui';
import { QUIZ_OPTIONS, QUIZ_QUESTION, VIDEO_LENGTH } from '../data';
import { useCourses, useExamResults } from '../hooks/useData';
import { formatTime, type LessonVideo } from '../hooks/useLessonVideo';
import { localDate } from '../lib/stats';
import { examResult } from '../lib/supabase';
import { C, L, MONO, tone } from '../theme';

const COLS = 'minmax(0, 1.3fr) minmax(0, 1.2fr) 100px 72px 96px';

type Props = { video: LessonVideo; quizAnswer: string | null; onAnswer: (key: string) => void };

const rateColor = (rate: number) => (rate >= 90 ? C.grn : rate >= 80 ? C.acc : C.amb);

export function Training({ video, quizAnswer, onAnswer }: Props) {
  const courses = useCourses();
  const exams = useExamResults();
  const courseList = [...courses.data].sort((a, b) => a.code.localeCompare(b.code));
  const examList = [...exams.data].sort((a, b) => b.taken_on.localeCompare(a.taken_on));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <DataState loading={courses.loading} error={courses.error} count={courseList.length} style={{ padding: 0 }} />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(215px, 1fr))', gap: 12 }}>
        {courseList.map((c) => (
          <Card key={c.code} style={{ padding: '14px 15px', display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
              <div style={{ fontSize: 13, fontWeight: 600, lineHeight: 1.35 }}>{c.name}</div>
              <div style={{ fontFamily: MONO, fontSize: 10, padding: '2px 6px', borderRadius: 4, background: 'oklch(0.96 0.01 265)', color: 'oklch(0.45 0.02 265)', whiteSpace: 'nowrap' }}>{c.code}</div>
            </div>
            <div style={{ fontSize: 11.5, color: 'oklch(0.52 0.02 265)' }}>{c.detail}</div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 11, color: 'oklch(0.5 0.02 265)', marginBottom: 5 }}>
                <span>อัตราผ่าน</span>
                <span style={{ fontFamily: MONO, color: 'oklch(0.3 0.02 265)', fontWeight: 500 }}>{c.pass_rate}%</span>
              </div>
              <Bar pct={`${c.pass_rate}%`} color={rateColor(c.pass_rate)} height={7} radius={4} />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 11, color: 'oklch(0.55 0.02 265)', borderTop: `1px solid ${L.rowBd}`, paddingTop: 9 }}>
              <span>ผู้เข้าอบรม {c.taken} คน</span>
              <span style={{ color: 'oklch(0.45 0.12 265)', fontWeight: 500, cursor: 'pointer' }}>จัดการข้อสอบ</span>
            </div>
          </Card>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(330px, 1fr))', gap: 16, alignItems: 'start' }}>
        <Card style={{ overflowX: 'auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', padding: '13px 18px', borderBottom: `1px solid ${L.headBd}` }}>
            <CardTitle title="ผลการทดสอบล่าสุด" sub="เกณฑ์ผ่าน 80% — ทดสอบใหม่ได้ 2 ครั้ง" style={{ flex: 1 }} />
            <OutlineButton style={{ padding: '6px 12px', borderRadius: 7, fontSize: 12 }}>ส่งออกผล</OutlineButton>
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

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <VideoCard video={video} />
          <ExamCard video={video} quizAnswer={quizAnswer} onAnswer={onAnswer} />
        </div>
      </div>
    </div>
  );
}

function VideoCard({ video }: { video: LessonVideo }) {
  const { sec, playing, done, toggle, finish } = video;
  const pct = Math.round((sec / VIDEO_LENGTH) * 100) + '%';
  const badge = done
    ? { label: 'ดูครบแล้ว', bg: C.grnBg, fg: C.grnFg }
    : playing
      ? { label: 'กำลังเล่น', bg: C.accBg, fg: C.accFg }
      : { label: 'ยังดูไม่ครบ', bg: C.ambBg, fg: C.ambFg };

  return (
    <Card style={{ padding: '16px 18px' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10, marginBottom: 3 }}>
        <div style={{ fontSize: 14, fontWeight: 600 }}>วิดีโอบทเรียน (บังคับดูให้ครบ)</div>
        <div style={{ fontSize: 10.5, fontWeight: 500, padding: '2px 8px', borderRadius: 4, whiteSpace: 'nowrap', background: badge.bg, color: badge.fg }}>{badge.label}</div>
      </div>
      <div style={{ fontSize: 11.5, color: 'oklch(0.56 0.02 265)', marginBottom: 14 }}>ความปลอดภัยพื้นฐานสำหรับผู้รับเหมา (TR-101) — ตอนที่ 1</div>

      <div onClick={toggle} style={{ aspectRatio: '16 / 9', borderRadius: 8, border: '1px solid oklch(0.88 0.01 265)', background: 'repeating-linear-gradient(135deg, oklch(0.29 0.03 265) 0 8px, oklch(0.25 0.03 265) 8px 16px)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', position: 'relative' }}>
        <div style={{ width: 46, height: 46, borderRadius: '50%', background: 'oklch(0.98 0.005 265 / 0.92)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, color: 'oklch(0.3 0.04 265)' }}>
          {done ? '↻' : playing ? '❙❙' : '▶'}
        </div>
        <div style={{ position: 'absolute', left: 10, bottom: 9, fontFamily: MONO, fontSize: 10, color: 'oklch(0.86 0.02 265)', letterSpacing: '0.04em' }}>TR-101 · SAFETY INDUCTION</div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 12 }}>
        <Bar pct={pct} color={done ? C.grn : C.acc} height={6} radius={3} track="oklch(0.94 0.01 265)" style={{ flex: 1 }} />
        <div style={{ fontFamily: MONO, fontSize: 11, color: 'oklch(0.45 0.02 265)', whiteSpace: 'nowrap' }}>
          {formatTime(sec)} / {formatTime(VIDEO_LENGTH)}
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10, marginTop: 9 }}>
        <div style={{ fontSize: 11.5, color: 'oklch(0.5 0.02 265)', lineHeight: 1.5 }}>
          {done
            ? 'ดูวิดีโอครบตามเกณฑ์ ระบบเปิดสิทธิ์ทำแบบทดสอบให้แล้ว'
            : 'ระบบบันทึกเวลาที่ดูจริง ข้ามหรือเร่งความเร็วไม่ได้ และต้องดูครบ 100% ก่อนเข้าทำแบบทดสอบ'}
        </div>
        {!done && (
          <div onClick={finish} className="h-underline" style={{ fontSize: 11, fontWeight: 500, color: 'oklch(0.45 0.12 265)', whiteSpace: 'nowrap', cursor: 'pointer', paddingTop: 1 }}>
            ข้ามไปท้ายวิดีโอ (สาธิต)
          </div>
        )}
      </div>
    </Card>
  );
}

function ExamCard({ video, quizAnswer, onAnswer }: Props) {
  const { sec, done } = video;
  return (
    <Card style={{ padding: '16px 18px' }}>
      <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 3 }}>แบบทดสอบออนไลน์</div>
      <div style={{ fontSize: 11.5, color: 'oklch(0.56 0.02 265)', marginBottom: 14 }}>
        {done ? 'หลักสูตรความปลอดภัยพื้นฐาน — ข้อ 4 จาก 20' : 'หลักสูตรความปลอดภัยพื้นฐาน — รอปลดล็อกจากการดูวิดีโอ'}
      </div>
      <Bar pct={done ? '20%' : '0%'} color="oklch(0.52 0.16 265)" height={5} radius={3} style={{ marginBottom: 16 }} />

      {!done ? (
        <div style={{ border: '1px dashed oklch(0.88 0.04 70)', background: 'oklch(0.975 0.03 70)', borderRadius: 9, padding: '18px 16px', textAlign: 'center' }}>
          <div style={{ width: 34, height: 34, margin: '0 auto 10px', borderRadius: 9, background: 'oklch(0.93 0.06 70)', color: 'oklch(0.42 0.11 70)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15 }}>◎</div>
          <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 5 }}>ยังไม่สามารถทำแบบทดสอบได้</div>
          <div style={{ fontSize: 11.5, color: 'oklch(0.47 0.04 70)', lineHeight: 1.55 }}>
            ต้องดูวิดีโอบทเรียนให้ครบ 100% ก่อน<br />
            ดูแล้ว {Math.round((sec / VIDEO_LENGTH) * 100)}% — เหลืออีก {formatTime(VIDEO_LENGTH - sec)}
          </div>
        </div>
      ) : (
        <>
          <div style={{ fontSize: 13.5, fontWeight: 500, lineHeight: 1.6, marginBottom: 14 }}>{QUIZ_QUESTION}</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {QUIZ_OPTIONS.map((q) => {
              const on = quizAnswer === q.key;
              return (
                <div key={q.key} onClick={() => onAnswer(q.key)} className="h-option" style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '11px 12px', borderRadius: 8, cursor: 'pointer', border: `1px solid ${on ? C.accBd : L.idle}`, background: on ? C.accBg : '#fff' }}>
                  <div style={{ width: 19, height: 19, flex: '0 0 19px', borderRadius: '50%', border: `1.5px solid ${on ? C.acc : 'oklch(0.82 0.01 265)'}`, background: on ? C.acc : '#fff', color: on ? '#fff' : C.mut, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: MONO, fontSize: 10.5, fontWeight: 600 }}>
                    {q.key}
                  </div>
                  <div style={{ fontSize: 12.5, lineHeight: 1.5 }}>{q.text}</div>
                </div>
              );
            })}
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
            <PrimaryButton style={{ flex: 1, textAlign: 'center', padding: 9, borderRadius: 8, fontSize: 12.5 }}>ข้อถัดไป</PrimaryButton>
            <OutlineButton style={{ padding: '9px 14px', borderRadius: 8, fontSize: 12.5 }}>ข้ามข้อนี้</OutlineButton>
          </div>
        </>
      )}
    </Card>
  );
}
