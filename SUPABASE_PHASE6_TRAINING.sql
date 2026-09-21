-- Phase 6: courses with YouTube videos, question banks and online exams graded in the database. Safe to re-run.

-- ---------- Courses ----------

ALTER TABLE courses
  ADD COLUMN IF NOT EXISTS video_url TEXT,
  ADD COLUMN IF NOT EXISTS pass_score INTEGER NOT NULL DEFAULT 80 CHECK (pass_score BETWEEN 1 AND 100),
  ADD COLUMN IF NOT EXISTS question_count INTEGER NOT NULL DEFAULT 10 CHECK (question_count BETWEEN 1 AND 100),
  ADD COLUMN IF NOT EXISTS active BOOLEAN NOT NULL DEFAULT true;

-- Only TR-101 starts as mandatory for everyone; later runs leave the safety officer's choices alone.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'courses' AND column_name = 'required') THEN
    ALTER TABLE courses ADD COLUMN required BOOLEAN NOT NULL DEFAULT false;
    UPDATE courses SET required = true WHERE code = 'TR-101';
  END IF;
END $$;

DROP POLICY IF EXISTS courses_insert ON courses;
DROP POLICY IF EXISTS courses_update ON courses;
CREATE POLICY courses_insert ON courses FOR INSERT TO authenticated WITH CHECK (my_role() = 'safety');
CREATE POLICY courses_update ON courses FOR UPDATE TO authenticated USING (my_role() = 'safety') WITH CHECK (my_role() = 'safety');
GRANT INSERT, UPDATE ON courses TO authenticated;

-- ---------- Question bank (answers visible to safety officers only) ----------

CREATE TABLE IF NOT EXISTS course_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_code TEXT NOT NULL REFERENCES courses(code) ON DELETE CASCADE,
  question TEXT NOT NULL,
  options TEXT[] NOT NULL,
  correct_index INTEGER NOT NULL,
  sort INTEGER NOT NULL DEFAULT 0,
  CONSTRAINT course_questions_valid CHECK (
    cardinality(options) BETWEEN 2 AND 6 AND correct_index >= 0 AND correct_index < cardinality(options)
  )
);

ALTER TABLE course_questions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS course_questions_safety ON course_questions;
CREATE POLICY course_questions_safety ON course_questions FOR ALL TO authenticated
  USING (my_role() = 'safety') WITH CHECK (my_role() = 'safety');
REVOKE ALL ON course_questions FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON course_questions TO authenticated;

-- ---------- Exam attempts (reached only through the functions below) ----------

CREATE TABLE IF NOT EXISTS exam_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_code TEXT NOT NULL REFERENCES courses(code) ON DELETE CASCADE,
  badge_id UUID NOT NULL REFERENCES badges(id) ON DELETE CASCADE,
  question_ids UUID[] NOT NULL,
  started_by UUID NOT NULL REFERENCES auth.users(id),
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  submitted_at TIMESTAMPTZ,
  score INTEGER
);
ALTER TABLE exam_attempts ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON exam_attempts FROM anon, authenticated;

ALTER TABLE exam_results ADD COLUMN IF NOT EXISTS badge_id UUID REFERENCES badges(id) ON DELETE SET NULL;

-- Draws random questions and returns them without the correct answers.
CREATE OR REPLACE FUNCTION public.start_exam(p_course_code TEXT, p_badge_id UUID)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_course courses;
  v_badge badges;
  v_ids UUID[];
  v_attempt UUID;
BEGIN
  SELECT * INTO v_course FROM courses WHERE code = p_course_code AND active;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'ไม่พบหลักสูตร หรือหลักสูตรนี้ปิดใช้งาน';
  END IF;

  SELECT * INTO v_badge FROM badges WHERE id = p_badge_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'ไม่พบผู้เข้าอบรม';
  END IF;
  IF NOT (my_role() = 'safety' OR (my_role() = 'contractor' AND v_badge.company = my_company())) THEN
    RAISE EXCEPTION 'ไม่มีสิทธิ์จัดสอบให้ผู้เข้าอบรมคนนี้';
  END IF;

  SELECT array_agg(id) INTO v_ids FROM (
    SELECT id FROM course_questions WHERE course_code = p_course_code ORDER BY random() LIMIT v_course.question_count
  ) q;
  IF v_ids IS NULL THEN
    RAISE EXCEPTION 'หลักสูตรนี้ยังไม่มีข้อสอบ';
  END IF;

  INSERT INTO exam_attempts (course_code, badge_id, question_ids, started_by)
  VALUES (p_course_code, p_badge_id, v_ids, auth.uid())
  RETURNING id INTO v_attempt;

  RETURN jsonb_build_object(
    'attempt_id', v_attempt,
    'questions', (
      SELECT jsonb_agg(jsonb_build_object('id', q.id, 'question', q.question, 'options', q.options) ORDER BY array_position(v_ids, q.id))
      FROM course_questions q WHERE q.id = ANY (v_ids)
    )
  );
END
$$;

-- Grades every drawn question (unanswered counts as wrong), records the result and refreshes the badge's training status.
CREATE OR REPLACE FUNCTION public.submit_exam(p_attempt_id UUID, p_answers JSONB)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_attempt exam_attempts;
  v_course courses;
  v_badge badges;
  v_total INTEGER;
  v_correct INTEGER;
  v_score INTEGER;
  v_passed BOOLEAN;
  v_required INTEGER;
  v_passed_required INTEGER;
BEGIN
  SELECT * INTO v_attempt FROM exam_attempts WHERE id = p_attempt_id FOR UPDATE;
  IF NOT FOUND OR v_attempt.started_by <> auth.uid() THEN
    RAISE EXCEPTION 'ไม่พบการสอบนี้';
  END IF;
  IF v_attempt.submitted_at IS NOT NULL THEN
    RAISE EXCEPTION 'ส่งคำตอบของการสอบนี้ไปแล้ว';
  END IF;

  SELECT * INTO v_course FROM courses WHERE code = v_attempt.course_code;
  SELECT * INTO v_badge FROM badges WHERE id = v_attempt.badge_id;

  v_total := cardinality(v_attempt.question_ids);
  SELECT count(*) INTO v_correct
  FROM course_questions q
  WHERE q.id = ANY (v_attempt.question_ids)
    AND jsonb_typeof(p_answers -> q.id::text) = 'number'
    AND (p_answers ->> q.id::text)::int = q.correct_index;

  v_score := round(100.0 * v_correct / v_total);
  v_passed := v_score >= v_course.pass_score;

  UPDATE exam_attempts SET submitted_at = now(), score = v_score WHERE id = p_attempt_id;

  INSERT INTO exam_results (name, company, course_code, taken_on, score, result, badge_id)
  VALUES (v_badge.name, v_badge.company, v_course.code, (now() AT TIME ZONE 'Asia/Bangkok')::date, v_score,
          CASE WHEN v_passed THEN 'pass' ELSE 'fail' END, v_badge.id);

  SELECT count(*) INTO v_required FROM courses WHERE required AND active;
  SELECT count(DISTINCT r.course_code) INTO v_passed_required
  FROM exam_results r JOIN courses c ON c.code = r.course_code
  WHERE r.badge_id = v_badge.id AND r.result = 'pass' AND c.required AND c.active;

  IF v_required > 0 THEN
    UPDATE badges SET
      training = 'ผ่าน ' || v_passed_required || '/' || v_required,
      training_status = CASE WHEN v_passed_required >= v_required THEN 'ok' ELSE 'warn' END,
      status = CASE WHEN status = 'pending_training' AND v_passed_required >= v_required THEN 'ready' ELSE status END
    WHERE id = v_badge.id;
  END IF;

  RETURN jsonb_build_object('score', v_score, 'passed', v_passed, 'correct', v_correct, 'total', v_total, 'pass_score', v_course.pass_score);
END
$$;

REVOKE ALL ON FUNCTION public.start_exam(TEXT, UUID) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.submit_exam(UUID, JSONB) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.start_exam(TEXT, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.submit_exam(UUID, JSONB) TO authenticated;
