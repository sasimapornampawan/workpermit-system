-- Phase 19: delete badges. Safe to re-run.
-- Safety officers can delete any badge. Contractors can withdraw their own pending requests but not issued cards.
-- Exam results keep their history (badge_id is cleared, the name and course stay).

GRANT DELETE ON badges TO authenticated;

DROP POLICY IF EXISTS badges_delete ON badges;
CREATE POLICY badges_delete ON badges FOR DELETE TO authenticated
  USING (
    can('manage_badges') AND (
      my_role() <> 'contractor'
      OR (company = my_company() AND status <> 'issued')
    )
  );
