-- Phase 17: remember which PPE was selected on each permit. Safe to re-run.
-- Stored as the list of labels, so the record keeps what was chosen even if the PPE catalogue changes later.

ALTER TABLE permits ADD COLUMN IF NOT EXISTS ppe TEXT[] NOT NULL DEFAULT '{}';
