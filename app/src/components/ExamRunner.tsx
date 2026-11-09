import { useEffect, useState } from 'react';
import { notifyDataChanged } from '../hooks/useData';
import { supabase, type Badge, type Course, type QuestionStage } from '../lib/supabase';
import { C, L, MONO, tone } from '../theme';
import { Button, Field, FormMessage, Select } from './form';
import { Bar, Card, Pill } from './ui';
import { YouTubePlayer, formatTime, youTubeId } from './YouTubePlayer';

type Question = { id: string; question: string; options: string[] };
type Attempt = { id: string; stage: QuestionStage; questions: Question[] };
type SubmitResult = {
  stage: QuestionStage;
  score: number;
  correct: number;
  total: number;
  passed?: boolean;
  pass_score?: number;
  /** Latest pre-test score for the same person, shown after the post-test. */
  pre_score?: number | null;
};
type Phase = 'select' | 'quiz' | 'pre-done' | 'video' | 'done';
/** 'empty' = the course has no pre-test, so the flow moves on. */
type StartOutcome = 'started' | 'empty' | 'error';

const OPTION_KEYS = ['ก', 'ข', 'ค', 'ง', 'จ', 'ฉ'];

export function ExamRunner({ course, badges }: { course: Course; badges: Badge[] }) {
  const [badgeId, setBadgeId] = useState('');
  const [phase, setPhase] = useState<Phase>('select');
  const [watched, setWatched] = useState({ seconds: 0, duration: 0 });
  const [videoDone, setVideoDone] = useState(false);
  const [attempt, setAttempt] = useState<Attempt | null>(null);
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [result, setResult] = useState<SubmitResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const videoId = course.video_url ? youTubeId(course.video_url) : null;
  const candidates = badges.filter((b) => b.status !== 'rejected').sort((a, b) => a.name.localeCompare(b.name, 'th'));
  const badge = badges.find((b) => b.id === badgeId);

  function reset(keepBadge: boolean) {
    if (!keepBadge) setBadgeId('');
    setPhase('select');
    setWatched({ seconds: 0, duration: 0 });
    setVideoDone(false);
    setAttempt(null);
    setIndex(0);
    setAnswers({});
    setResult(null);
    setError(null);
  }

  useEffect(() => reset(false), [course.code]);

  async function startAttempt(stage: QuestionStage): Promise<StartOutcome> {
    if (!supabase) return 'error';
    setBusy(true);
    setError(null);
    const { data, error: err } = await supabase.rpc('start_exam', { p_course_code: course.code, p_badge_id: badgeId, p_stage: stage });
    setBusy(false);
    if (err) {
      setError(err.message);
      return 'error';
    }
    if (!data.attempt_id) return 'empty';
    setAttempt({ id: data.attempt_id, stage, questions: data.questions });
    setResult(null);
    setIndex(0);
    setAnswers({});
    setPhase('quiz');
    return 'started';
  }

  // After the pre-test (or straight from the start when there is none): watch the video, or take the post-test if there is no video.
  function goToTraining() {
    if (videoId) setPhase('video');
    else startAttempt('post');
  }

  async function begin() {
    const outcome = await startAttempt('pre');
    if (outcome === 'empty') goToTraining();
  }

  async function submit() {
    if (!supabase || !attempt) return;
    const unanswered = attempt.questions.filter((q) => answers[q.id] === undefined).length;
    if (unanswered && !window.confirm(`ยังไม่ได้ตอบ ${unanswered} ข้อ ข้อที่ไม่ตอบจะนับว่าผิด ส่งคำตอบเลยไหม?`)) return;
    setBusy(true);
    setError(null);
    const { data, error: err } = await supabase.rpc('submit_exam', { p_attempt_id: attempt.id, p_answers: answers });
    setBusy(false);
    if (err) {
      setError(`ส่งคำตอบไม่สำเร็จ: ${err.message}`);
      return;
    }
    setResult(data as SubmitResult);
    setPhase(attempt.stage === 'pre' ? 'pre-done' : 'done');
    notifyDataChanged();
  }

  const question = attempt?.questions[index];
  const last = attempt ? index === attempt.questions.length - 1 : false;

  return (
    <Card style={{ padding: '16px 18px' }}>
      <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 2 }}>อบรมและทดสอบออนไลน์</div>
      <div style={{ fontSize: 11.5, color: 'oklch(0.56 0.02 265)', marginBottom: 14 }}>
        {course.name} ({course.code}) — เกณฑ์ผ่าน {course.pass_score}% · {course.question_count} ข้อ
        {badge && phase !== 'select' ? ` · ${badge.name}` : ''}
      </div>

      {phase === 'select' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <Field label="ผู้เข้าอบรม">
            <Select value={badgeId} onChange={(e) => setBadgeId(e.target.value)}>
              <option value="">— เลือกพนักงาน —</option>
              {candidates.map((b) => <option key={b.id} value={b.id}>{b.name} — {b.company}</option>)}
            </Select>
          </Field>
          <div style={{ fontSize: 11.5, color: 'oklch(0.5 0.02 265)', lineHeight: 1.55 }}>
            หัวหน้างานเลือกชื่อพนักงาน แล้วให้พนักงานทำข้อสอบและดูวิดีโอด้วยตนเอง
            {' '}ถ้าหลักสูตรมีข้อสอบก่อนอบรม ระบบจะให้ทำก่อน แล้วจึงดูวิดีโอและทำแบบทดสอบหลังอบรม
            {!candidates.length && ' — ยังไม่มีรายชื่อ ให้เพิ่มคำขอบัตรในเมนูบัตรผู้รับเหมาก่อน'}
          </div>
          {course.video_url && !videoId && <FormMessage error>ลิงก์วิดีโอของหลักสูตรนี้ไม่ใช่ลิงก์ YouTube ที่ถูกต้อง</FormMessage>}
          <Button disabled={!badgeId || busy || (!!course.video_url && !videoId)} onClick={begin} style={{ padding: 9 }}>
            {busy ? 'กำลังเตรียมข้อสอบ...' : 'เริ่มการอบรม'}
          </Button>
        </div>
      )}

      {phase === 'quiz' && attempt && question && (
        <div>
          <div style={{ fontSize: 12, fontWeight: 600, color: C.accFg, marginBottom: 4 }}>
            {attempt.stage === 'pre' ? 'แบบทดสอบก่อนอบรม (พรีเทส)' : 'แบบทดสอบหลังอบรม'}
          </div>
          <div style={{ fontSize: 11.5, color: 'oklch(0.5 0.02 265)', marginBottom: 6 }}>ข้อ {index + 1} จาก {attempt.questions.length}</div>
          <Bar pct={`${Math.round(((index + 1) / attempt.questions.length) * 100)}%`} color="oklch(0.52 0.16 265)" height={5} radius={3} style={{ marginBottom: 16 }} />
          <div style={{ fontSize: 13.5, fontWeight: 500, lineHeight: 1.6, marginBottom: 14, whiteSpace: 'pre-wrap' }}>{question.question}</div>
          <div role="radiogroup" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {question.options.map((text, i) => {
              const on = answers[question.id] === i;
              return (
                <div
                  key={i}
                  role="radio"
                  aria-checked={on}
                  tabIndex={0}
                  onClick={() => setAnswers({ ...answers, [question.id]: i })}
                  onKeyDown={(e) => (e.key === ' ' || e.key === 'Enter') && setAnswers({ ...answers, [question.id]: i })}
                  className="h-option"
                  style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '11px 12px', borderRadius: 8, cursor: 'pointer', border: `1px solid ${on ? C.accBd : L.idle}`, background: on ? C.accBg : '#fff' }}
                >
                  <div style={{ width: 19, height: 19, flex: '0 0 19px', borderRadius: '50%', border: `1.5px solid ${on ? C.acc : 'oklch(0.82 0.01 265)'}`, background: on ? C.acc : '#fff', color: on ? '#fff' : C.mut, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: MONO, fontSize: 10.5, fontWeight: 600 }}>
                    {OPTION_KEYS[i]}
                  </div>
                  <div style={{ fontSize: 12.5, lineHeight: 1.5 }}>{text}</div>
                </div>
              );
            })}
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
            <Button variant="outline" disabled={index === 0} onClick={() => setIndex(index - 1)}>ข้อก่อนหน้า</Button>
            {last ? (
              <Button disabled={busy} onClick={submit} style={{ flex: 1 }}>{busy ? 'กำลังตรวจคำตอบ...' : 'ส่งคำตอบ'}</Button>
            ) : (
              <Button onClick={() => setIndex(index + 1)} style={{ flex: 1 }}>ข้อถัดไป</Button>
            )}
          </div>
        </div>
      )}

      {phase === 'pre-done' && result && (
        <div style={{ textAlign: 'center', padding: '8px 0' }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: 'oklch(0.45 0.02 265)', marginBottom: 4 }}>ผลก่อนอบรม (พรีเทส)</div>
          <div style={{ fontFamily: MONO, fontSize: 36, fontWeight: 600, color: C.accFg }}>{result.score}%</div>
          <div style={{ fontSize: 12.5, color: 'oklch(0.45 0.02 265)', margin: '6px 0 16px' }}>
            ตอบถูก {result.correct} จาก {result.total} ข้อ — บันทึกไว้เพื่อเปรียบเทียบกับผลหลังอบรม (ไม่นับผ่าน/ไม่ผ่าน)
          </div>
          <Button disabled={busy} onClick={goToTraining}>{videoId ? 'ไปดูวิดีโออบรม' : 'เริ่มทำแบบทดสอบหลังอบรม'}</Button>
        </div>
      )}

      {phase === 'video' && videoId && (
        <div>
          <YouTubePlayer
            videoId={videoId}
            onProgress={(seconds, duration) => setWatched({ seconds, duration })}
            onComplete={() => setVideoDone(true)}
          />
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 12 }}>
            <Bar pct={`${watched.duration ? Math.round((watched.seconds / watched.duration) * 100) : 0}%`} color={videoDone ? C.grn : C.acc} height={6} radius={3} track="oklch(0.94 0.01 265)" style={{ flex: 1 }} />
            <div style={{ fontFamily: MONO, fontSize: 11, color: 'oklch(0.45 0.02 265)', whiteSpace: 'nowrap' }}>
              {formatTime(watched.seconds)} / {formatTime(watched.duration)}
            </div>
          </div>
          <div style={{ fontSize: 11.5, color: 'oklch(0.5 0.02 265)', lineHeight: 1.5, margin: '9px 0 12px' }}>
            {videoDone ? 'ดูวิดีโอครบแล้ว เริ่มทำแบบทดสอบหลังอบรมได้' : 'กดเล่นวิดีโอ ระบบนับเฉพาะเวลาที่ดูจริง ข้ามหรือเร่งความเร็วไม่ได้'}
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <Button variant="outline" onClick={() => reset(false)}>ยกเลิก</Button>
            <Button disabled={!videoDone || busy} onClick={() => startAttempt('post')} style={{ flex: 1 }}>{busy ? 'กำลังเตรียมข้อสอบ...' : 'เริ่มทำแบบทดสอบหลังอบรม'}</Button>
          </div>
        </div>
      )}

      {phase === 'done' && result && (
        <div style={{ textAlign: 'center', padding: '8px 0' }}>
          <div style={{ fontFamily: MONO, fontSize: 36, fontWeight: 600, color: tone(result.passed ? 'ok' : 'bad').fg }}>{result.score}%</div>
          <div style={{ margin: '6px 0 8px' }}><Pill t={result.passed ? 'ok' : 'bad'}>{result.passed ? 'ผ่าน' : 'ไม่ผ่าน'}</Pill></div>
          <div style={{ fontSize: 12.5, color: 'oklch(0.45 0.02 265)', marginBottom: 6 }}>
            ตอบถูก {result.correct} จาก {result.total} ข้อ (เกณฑ์ผ่าน {result.pass_score}%) — บันทึกผลแล้ว
          </div>
          {typeof result.pre_score === 'number' && (
            <div style={{ fontSize: 12.5, color: 'oklch(0.45 0.02 265)', marginBottom: 10 }}>
              ก่อนอบรม {result.pre_score}% → หลังอบรม {result.score}%
            </div>
          )}
          <div style={{ display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap', marginTop: 10 }}>
            {!result.passed && <Button variant="outline" disabled={busy} onClick={() => startAttempt('post')}>สอบใหม่</Button>}
            <Button onClick={() => reset(false)}>ผู้เข้าอบรมคนถัดไป</Button>
          </div>
        </div>
      )}

      {error && <FormMessage error style={{ marginTop: 12 }}>{error}</FormMessage>}
    </Card>
  );
}
