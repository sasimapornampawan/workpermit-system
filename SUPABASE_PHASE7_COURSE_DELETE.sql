-- Phase 7: let safety officers delete courses. Safe to re-run.
-- A course that already has exam results cannot be deleted (exam_results keeps its foreign key), so history is never lost;
-- deleting removes the course's questions and unfinished attempts with it.

DROP POLICY IF EXISTS courses_delete ON courses;
CREATE POLICY courses_delete ON courses FOR DELETE TO authenticated USING (my_role() = 'safety');
GRANT DELETE ON courses TO authenticated;
