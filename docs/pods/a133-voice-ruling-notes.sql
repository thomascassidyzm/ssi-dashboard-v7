-- A-133 ear verdict (Tom, 2026-08-17) → voices.notes
--
-- `voices` has NO status column and `is_active` is never read as a selection
-- gate, so `notes` is the only field in that table a ruling can be recorded in.
-- Precedent: the T-21 `sal` gender note, commit 9563e8b1, same day.
--
-- ADDITIVE AND GUARDED. Ten rows get a note where the column is NULL; `sal`
-- gets its existing T-21 note APPENDED to, never overwritten. Nothing is
-- deleted, no other column is touched, and every statement is idempotent —
-- re-running writes nothing, because each WHERE excludes rows that already
-- carry the A-133 marker.
--
-- Full record: docs/pods/a133-ear-verdict-casting-rulings-2026-08-17.md

BEGIN;

-- Guard: all eleven rows must exist, or nothing runs.
DO $$
DECLARE n int;
BEGIN
  SELECT count(*) INTO n FROM voices WHERE voice_id IN (
    'gfzdpspr5fdp','bedd6226','eve','sal','leo',
    'nl-NL-FennaNeural','nl-NL-MaartenNeural',
    '58d27475085e','a13662ba951c','244e27b39200','247783ebdd51');
  IF n <> 11 THEN
    RAISE EXCEPTION 'expected 11 voice rows, found %', n;
  END IF;
END $$;

-- ── English leads ────────────────────────────────────────────────────────────
UPDATE voices SET notes =
'A-133 EAR VERDICT (Tom, 2026-08-17): LEAD / PRIMARY for English. He listened to the 55-clip phrase test — 11 voices x 5 different lines, fresh renders through the wired chain — and named this voice and Olivia (bedd6226) "the BEST", making them the leads for English. RECORDED, NOT ENFORCED: no code reads a casting status off this table; see docs/pods/a133-ear-verdict-casting-rulings-2026-08-17.md for the migration that would make it bind.'
WHERE voice_id = 'gfzdpspr5fdp' AND notes IS NULL;

UPDATE voices SET notes =
'A-133 EAR VERDICT (Tom, 2026-08-17): LEAD / PRIMARY for English. He listened to the 55-clip phrase test — 11 voices x 5 different lines, fresh renders through the wired chain — and named this voice and his own clone (gfzdpspr5fdp) "the BEST", making them the leads for English. RECORDED, NOT ENFORCED: no code reads a casting status off this table; see docs/pods/a133-ear-verdict-casting-rulings-2026-08-17.md.'
WHERE voice_id = 'bedd6226' AND notes IS NULL;

-- ── Out / benched ────────────────────────────────────────────────────────────
UPDATE voices SET notes =
'A-133 EAR VERDICT (Tom, 2026-08-17): OUT. His reason: the register is completely wrong for learning content. Judged on the 55-clip phrase test (5 different lines per voice, fresh renders through the wired chain). NOT YET ACTED ON, deliberately: eve is half the multilingual female overflow in tools/pod-voice-coverage.cjs (MULTI_F is ara + eve), so filtering it can leave a language with an empty female list and a hard "No target voice available" at cast time, and it is read from courses.voice_config by 21 courses. Replacing it is a per-course pass, not a pool filter. See docs/pods/a133-ear-verdict-casting-rulings-2026-08-17.md.'
WHERE voice_id = 'eve' AND notes IS NULL;

UPDATE voices SET notes =
'A-133 EAR VERDICT (Tom, 2026-08-17): BENCHED. His reason: fine, but redundant. Judged on the 55-clip phrase test. Already excluded from the multilingual TARGET overflow in tools/pod-voice-coverage.cjs (it is reserved for the KNOWN pool), so no code change follows from this. Read from courses.voice_config by 8 courses. See docs/pods/a133-ear-verdict-casting-rulings-2026-08-17.md.'
WHERE voice_id = 'leo' AND notes IS NULL;

-- sal already carries the T-21 gender ruling. APPEND, never overwrite.
UPDATE voices SET notes = notes ||
E'\n\nA-133 EAR VERDICT (Tom, 2026-08-17): OUT. A second and independent reason on top of the gender note above — his verdict on the 55-clip phrase test was that sal has an AMERICAN ACCENT, which rules it out of the English cast regardless of what seat it is offered. Read from courses.voice_config by 1 course. See docs/pods/a133-ear-verdict-casting-rulings-2026-08-17.md.'
WHERE voice_id = 'sal' AND notes IS NOT NULL AND notes NOT LIKE '%A-133 EAR VERDICT%';

-- ── Dutch: Azure rejected ────────────────────────────────────────────────────
UPDATE voices SET notes =
'A-133 EAR VERDICT (Tom, 2026-08-17): REJECTED — UNUSABLE on quality grounds. Judged on the 55-clip phrase test (5 different Dutch lines, fresh renders through the wired chain). His ruling was broader than this voice: DROP AZURE FOR DUTCH ENTIRELY — Dutch goes xAI. NOT YET REMOVED from app_config.pod_voice_pools.nld, where it still sits at index 2 of the female list; removing it shortens the Dutch pool to 2f/2m and is a casting change with a render consequence, so it is Tom''s to authorise. This voice has ~4,798 clips in nld_for_eng. See docs/pods/a133-ear-verdict-casting-rulings-2026-08-17.md.'
WHERE voice_id = 'nl-NL-FennaNeural' AND notes IS NULL;

UPDATE voices SET notes =
'A-133 EAR VERDICT (Tom, 2026-08-17): REJECTED — UNUSABLE on quality grounds. Judged on the 55-clip phrase test (5 different Dutch lines, fresh renders through the wired chain). His ruling was broader than this voice: DROP AZURE FOR DUTCH ENTIRELY — Dutch goes xAI. NOT YET REMOVED from app_config.pod_voice_pools.nld, where it still sits at index 2 of the male list; removing it shortens the Dutch pool to 2f/2m and is a casting change with a render consequence, so it is Tom''s to authorise. This voice has ~4,787 clips in nld_for_eng. See docs/pods/a133-ear-verdict-casting-rulings-2026-08-17.md.'
WHERE voice_id = 'nl-NL-MaartenNeural' AND notes IS NULL;

-- ── Dutch: xAI passes ────────────────────────────────────────────────────────
UPDATE voices SET notes =
'A-133 EAR VERDICT (Tom, 2026-08-17): PASSES PERFECTLY. Judged on the 55-clip phrase test (5 different Dutch lines, fresh renders through the wired chain); his ruling was that all xAI Dutch voices other than Noor pass, and that Dutch goes xAI. NOTE this voice is NOT in the live app_config.pod_voice_pools.nld pool (which holds Lieke/Sophie and Bas/Daan) — promoting it is a new cast and is Tom''s call. See docs/pods/a133-ear-verdict-casting-rulings-2026-08-17.md.'
WHERE voice_id = '58d27475085e' AND notes IS NULL;

UPDATE voices SET notes =
'A-133 EAR VERDICT (Tom, 2026-08-17): PASSES PERFECTLY on the 55-clip phrase test (5 different Dutch lines, fresh renders through the wired chain). ⚠ THIS CONTRADICTS THE T-21 RULING of the same day, which rejected this voice from the T-21 casting page as "misgendered in the labels, and not good enough anyway" (docs/pods/t21-casting-rulings-2026-08-17.md, Dutch section). Different material — labelled casting-page samples vs five unlabelled fresh lines. UNRESOLVED, Tom''s call; nothing has been recast on either reading. See docs/pods/a133-ear-verdict-casting-rulings-2026-08-17.md.'
WHERE voice_id = 'a13662ba951c' AND notes IS NULL;

UPDATE voices SET notes =
'A-133 EAR VERDICT (Tom, 2026-08-17): PASSES PERFECTLY. Judged on the 55-clip phrase test (5 different Dutch lines, fresh renders through the wired chain); his ruling was that all xAI Dutch voices other than Noor pass, and that Dutch goes xAI. NOTE this voice is NOT in the live app_config.pod_voice_pools.nld pool — promoting it is a new cast and is Tom''s call. See docs/pods/a133-ear-verdict-casting-rulings-2026-08-17.md.'
WHERE voice_id = '244e27b39200' AND notes IS NULL;

-- ── Dutch: Noor, under review ────────────────────────────────────────────────
UPDATE voices SET notes =
'A-133 EAR VERDICT (Tom, 2026-08-17): UNDER REVIEW — deliberately NOT rejected and NOT approved. On the 55-clip phrase test she FAILS phrases p1 and p3 and PASSES p2, p4 and p5. She is the known female clicker the A-133 tail work was chasing; the hold stands pending the p1/p3 click diagnosis. Do not cast her and do not write her off until that lands. Separately, T-21 rejected her the same day as "misgendered in the labels, and not good enough anyway" (docs/pods/t21-casting-rulings-2026-08-17.md) — that ruling is not overturned here. See docs/pods/a133-ear-verdict-casting-rulings-2026-08-17.md.'
WHERE voice_id = '247783ebdd51' AND notes IS NULL;

COMMIT;
