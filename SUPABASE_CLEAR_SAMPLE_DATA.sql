-- Removes all sample and test data before real use. Keeps login accounts, staff roles and the course list.
-- Contractor logins lose their role (they were linked to sample companies); link them again after importing real companies.
-- Runs as one transaction: if any statement fails, nothing is deleted.

BEGIN;

DELETE FROM permit_events;
DELETE FROM permit_approvals;
DELETE FROM permits;
DELETE FROM findings;
DELETE FROM exam_results;
DELETE FROM badges;
DELETE FROM alerts;
DELETE FROM monthly_reports;
DELETE FROM recommendations;
DELETE FROM profiles WHERE role = 'contractor';
DELETE FROM contractors;

-- Course names stay; their sample statistics are reset.
UPDATE courses SET pass_rate = 0, taken = 0;

-- New permits start again at WP-<year>-<MMDD>-001.
ALTER SEQUENCE permit_no_seq RESTART WITH 1;

COMMIT;

-- Check: every count below should be 0 except courses and profiles.
SELECT 'contractors' AS table_name, count(*) FROM contractors
UNION ALL SELECT 'permits', count(*) FROM permits
UNION ALL SELECT 'badges', count(*) FROM badges
UNION ALL SELECT 'findings', count(*) FROM findings
UNION ALL SELECT 'exam_results', count(*) FROM exam_results
UNION ALL SELECT 'alerts', count(*) FROM alerts
UNION ALL SELECT 'monthly_reports', count(*) FROM monthly_reports
UNION ALL SELECT 'recommendations', count(*) FROM recommendations
UNION ALL SELECT 'courses', count(*) FROM courses
UNION ALL SELECT 'profiles', count(*) FROM profiles;
