-- ============================================================================
-- DO NOT RUN WITHOUT FOUNDER-APPROVED ID LIST
-- ============================================================================
-- This script is PREPARED, NOT APPROVED. Phase 2 of docs/db-cleanup-inventory-2026-07-17.md.
-- Tom must review that inventory and confirm/edit the id arrays below (esp. the two
-- "surprising finding" rows Angharad 001/Cardiff 001, which have is_test=false, and the
-- Aran's Irish School judgment-fork, which is NOT included below and should stay that way
-- unless Tom explicitly says to add it) before this is ever executed.
--
-- Dev/staging/prod share ONE Supabase database. Run this against DATABASE_URL from
-- .env.psql via psql, inside the transaction as written — do not split it up.
--
-- Order of operations (no cascade exists on these FKs, so order matters):
--   1. null out schools.invite_code_id / govt_admins.invite_code_id for affected rows
--   2. delete invite_codes referencing the affected schools/groups/their classes
--   3. delete govt_admins referencing the affected groups
--   4. delete demo_orgs referencing the affected schools/groups (expected: none)
--   5. delete user_tags referencing the affected schools (no FK, just hygiene)
--   6. delete schools (cascades to classes -> class_sessions, and entitlement_grants)
--   7. delete groups
-- A row-count assertion runs before COMMIT; if it doesn't match expectations the
-- transaction raises and rolls back automatically.
-- ============================================================================

BEGIN;

-- ---- Approved id lists (from docs/db-cleanup-inventory-2026-07-17.md recommendations) ----
CREATE TEMP TABLE approved_school_ids (id uuid) ON COMMIT DROP;
INSERT INTO approved_school_ids (id) VALUES
  ('b50c8ecb-b3d2-4155-9b81-0406678f6746'), -- 日本-001
  ('440bd184-9877-429e-930d-44852ff2541d'), -- Salesian College
  ('46b5aaec-34c2-4437-b480-d45408827716'), -- Salesian-2
  ('096438ed-b3a1-4579-b33d-895f3fcda1fb'), -- E2E School 1783958726227
  ('3429994d-2f2a-4725-8e47-8abe63e4e7f7'), -- Tom School 001
  ('59ec8b40-62aa-4640-be79-e88cfcefa368'), -- Gwynedd School 001
  ('23348bd3-41e4-40dd-9a01-c0a9d87bf4c7'), -- Gwynedd School 002
  ('f13777bd-204a-4b85-a617-9bc206ae7713'), -- Gwynedd School 003
  ('030256f0-8fa6-4570-a3f8-b3f5dab3a9ae'), -- Bangor 001
  ('eae2749f-6682-4090-a8c8-53977dc887a3'), -- Python 001
  ('d8577963-6db2-470a-88a9-c2821122b922'), -- Angharad 001 (is_test=false — surprising finding, confirm)
  ('3146393d-2d3d-46b2-8633-b47856006fc3'), -- Angharad 002
  ('6634d0ef-0790-4aae-8fe1-f9279c38b487');  -- Cardiff 001 (is_test=false — surprising finding, confirm)

CREATE TEMP TABLE approved_group_ids (id uuid) ON COMMIT DROP;
INSERT INTO approved_group_ids (id) VALUES
  ('a79cc097-4613-4cd7-b394-171f123645c3'), -- Tom Test Group (orphan)
  ('ceee815a-462c-4652-a781-5a62c7be6210'), -- E2E Region 1783958726227 (renamed)
  ('ba23682c-6de8-4981-b479-258c4499adf4'), -- Tom Test Group
  ('c7db460c-75a8-48d2-8de7-1278449c88c8'), -- Gwynedd Ed Test
  ('0fe746e0-a355-4cfd-8eb0-2dfef711abd6'), -- Bangor
  ('903dad89-3382-42c6-b595-3932bc4b0f3a'), -- Python Community District
  ('8e99c868-8d0a-40ae-b4bc-8a74269e695a'), -- Angharad District
  ('7f492d77-fa50-4dd5-986f-78667f9f14a5');  -- Welsh Gov Lang Office

-- Sanity: expect 13 schools / 8 groups before touching anything.
DO $$
DECLARE
  school_ct int;
  group_ct int;
BEGIN
  SELECT count(*) INTO school_ct FROM approved_school_ids;
  SELECT count(*) INTO group_ct FROM approved_group_ids;
  IF school_ct <> 13 OR group_ct <> 8 THEN
    RAISE EXCEPTION 'id list drift: expected 13 schools / 8 groups, got % / %', school_ct, group_ct;
  END IF;
END $$;

-- ---- 1. Break schools -> invite_codes and govt_admins -> invite_codes links ----
UPDATE schools SET invite_code_id = NULL
  WHERE id IN (SELECT id FROM approved_school_ids) AND invite_code_id IS NOT NULL;

UPDATE govt_admins SET invite_code_id = NULL
  WHERE group_id IN (SELECT id FROM approved_group_ids) AND invite_code_id IS NOT NULL;

-- ---- 2. Delete invite_codes referencing the approved schools/groups/their classes ----
DELETE FROM invite_codes
  WHERE grants_school_id IN (SELECT id FROM approved_school_ids)
     OR grants_group_id IN (SELECT id FROM approved_group_ids)
     OR grants_class_id IN (SELECT id FROM classes WHERE school_id IN (SELECT id FROM approved_school_ids));

-- ---- 3. Delete govt_admins referencing the approved groups ----
DELETE FROM govt_admins WHERE group_id IN (SELECT id FROM approved_group_ids);

-- ---- 4. Delete demo_orgs referencing the approved schools/groups (expected: 0 rows) ----
DELETE FROM demo_orgs
  WHERE school_id IN (SELECT id FROM approved_school_ids)
     OR group_id IN (SELECT id FROM approved_group_ids);

-- ---- 5. Clean up user_tags pointing at the approved schools (no FK, hygiene only) ----
DELETE FROM user_tags
  WHERE tag_type = 'school'
    AND tag_value IN (SELECT 'SCHOOL:' || id FROM approved_school_ids);

-- ---- 6. Delete schools (cascades: classes -> class_sessions, entitlement_grants) ----
DELETE FROM schools WHERE id IN (SELECT id FROM approved_school_ids);

-- ---- 7. Delete groups ----
DELETE FROM groups WHERE id IN (SELECT id FROM approved_group_ids);

-- ---- Final sanity assertion before COMMIT ----
DO $$
DECLARE
  remaining_schools int;
  remaining_groups int;
BEGIN
  SELECT count(*) INTO remaining_schools FROM schools WHERE id IN (SELECT id FROM approved_school_ids);
  SELECT count(*) INTO remaining_groups FROM groups WHERE id IN (SELECT id FROM approved_group_ids);
  IF remaining_schools <> 0 OR remaining_groups <> 0 THEN
    RAISE EXCEPTION 'cleanup incomplete: % schools / % groups still present', remaining_schools, remaining_groups;
  END IF;
END $$;

-- Review the output above, then:
-- COMMIT;
ROLLBACK; -- safety default: change to COMMIT only after founder approval + a manual re-run
