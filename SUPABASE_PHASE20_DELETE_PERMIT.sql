-- Phase 20: delete work permit requests. Safe to re-run.
-- Safety officers can delete a request that is still pending or was rejected (its approval history and attachments go with it).
-- Contractors can withdraw their own pending request, as long as nobody has decided on it yet.
-- Approved, active, suspended or closed permits are never deleted, so the work record is kept.

GRANT DELETE ON permits TO authenticated;

DROP POLICY IF EXISTS permits_delete ON permits;
CREATE POLICY permits_delete ON permits FOR DELETE TO authenticated
  USING (
    (my_role() = 'safety' AND can('approve_permits') AND status IN ('pending', 'rejected'))
    OR (
      my_role() = 'contractor' AND can('request_permits') AND status = 'pending'
      AND contractor_id = my_contractor_id()
      AND NOT EXISTS (SELECT 1 FROM permit_approvals a WHERE a.permit_id = permits.id)
    )
  );
