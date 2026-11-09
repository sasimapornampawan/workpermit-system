-- Phase 22: pre-test (ข้อสอบก่อนอบรม) before the video. Safe to re-run.
-- stage = 'pre' is the pre-test bank / attempt; 'post' keeps the existing exam behaviour.
-- Pre-test scores are kept in exam_attempts only, so they never change pass rates or badge training status.

ALTER TABLE course_questions ADD COLUMN IF NOT EXISTS stage TEXT NOT NULL DEFAULT 'post' CHECK (stage IN ('pre', 'post'));
ALTER TABLE exam_attempts ADD COLUMN IF NOT EXISTS stage TEXT NOT NULL DEFAULT 'post' CHECK (stage IN ('pre', 'post'));

-- Pre-test: draws every pre-test question (random order). Returns attempt_id null when the course has no pre-test.
-- Post-test: draws question_count questions from the post bank, as before.
DROP FUNCTION IF EXISTS public.start_exam(TEXT, UUID);

CREATE OR REPLACE FUNCTION public.start_exam(p_course_code TEXT, p_badge_id UUID, p_stage TEXT DEFAULT 'post')
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_course courses;
  v_badge badges;
  v_ids UUID[];
  v_attempt UUID;
BEGIN
  IF p_stage NOT IN ('pre', 'post') THEN
    RAISE EXCEPTION 'ประเภทข้อสอบไม่ถูกต้อง';
  END IF;
  IF NOT can('run_exams') THEN
    RAISE EXCEPTION 'ไม่มีสิทธิ์จัดสอบ';
  END IF;

  SELECT * INTO v_course FROM courses WHERE code = p_course_code AND active;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'ไม่พบหลักสูตร หรือหลักสูตรนี้ปิดใช้งาน';
  END IF;

  SELECT * INTO v_badge FROM badges WHERE id = p_badge_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'ไม่พบผู้เข้าอบรม';
  END IF;
  IF my_role() = 'contractor' AND v_badge.company IS DISTINCT FROM my_company() THEN
    RAISE EXCEPTION 'ไม่มีสิทธิ์จัดสอบให้ผู้เข้าอบรมคนนี้';
  END IF;

  IF p_stage = 'pre' THEN
    SELECT array_agg(id) INTO v_ids FROM (
      SELECT id FROM course_questions WHERE course_code = p_course_code AND stage = 'pre' ORDER BY random()
    ) q;
    IF v_ids IS NULL THEN
      RETURN jsonb_build_object('attempt_id', NULL, 'questions', '[]'::jsonb);
    END IF;
  ELSE
    SELECT array_agg(id) INTO v_ids FROM (
      SELECT id FROM course_questions WHERE course_code = p_course_code AND stage = 'post' ORDER BY random() LIMIT v_course.question_count
    ) q;
    IF v_ids IS NULL THEN
      RAISE EXCEPTION 'หลักสูตรนี้ยังไม่มีข้อสอบ';
    END IF;
  END IF;

  INSERT INTO exam_attempts (course_code, badge_id, question_ids, started_by, stage)
  VALUES (p_course_code, p_badge_id, v_ids, auth.uid(), p_stage)
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

-- Pre-test: grades and returns only the score (no results row, no badge change).
-- Post-test: records the result and refreshes the badge's training status, and returns the latest pre-test score for comparison.
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
  v_pre INTEGER;
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

  UPDATE exam_attempts SET submitted_at = now(), score = v_score WHERE id = p_attempt_id;

  IF v_attempt.stage = 'pre' THEN
    RETURN jsonb_build_object('stage', 'pre', 'score', v_score, 'correct', v_correct, 'total', v_total);
  END IF;

  v_passed := v_score >= v_course.pass_score;

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

  SELECT score INTO v_pre FROM exam_attempts
  WHERE badge_id = v_attempt.badge_id AND course_code = v_attempt.course_code
    AND stage = 'pre' AND submitted_at IS NOT NULL AND started_at < v_attempt.started_at
  ORDER BY started_at DESC
  LIMIT 1;

  RETURN jsonb_build_object(
    'stage', 'post', 'score', v_score, 'passed', v_passed, 'correct', v_correct, 'total', v_total,
    'pass_score', v_course.pass_score, 'pre_score', v_pre
  );
END
$$;

REVOKE ALL ON FUNCTION public.start_exam(TEXT, UUID, TEXT) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.submit_exam(UUID, JSONB) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.start_exam(TEXT, UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.submit_exam(UUID, JSONB) TO authenticated;
