-- Phase 21: one permit can cover several work types. Safe to re-run.
-- work_types holds the selected type codes (e.g. {HW-01, CS-02}); permits.type keeps a readable label for older screens.

ALTER TABLE permits ADD COLUMN IF NOT EXISTS work_types TEXT[] NOT NULL DEFAULT '{}';
