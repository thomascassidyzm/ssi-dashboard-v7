-- Welsh declares its two dialects, and its two recordists declare theirs.
-- (Tom's ruling, 2026-08-19. Structure: 20260819-course-dialect.sql.)
--
-- This is the file that actually moves lines, and it moves them in ONE
-- direction: Southern lines stop being Northern work. It cannot move a line the
-- other way, because there is no Southern voice cast — see the last section.
--
-- Only Welsh is touched. Every other course and every other voice keeps the
-- 'standard' default on both sides, so every other queue is unchanged.

-- ── 1. the two English-known Welsh courses say which accent they are ─────────
--
-- Named one at a time rather than matched on the '_n_'/'_s_' in the code: the
-- point of the column is that the course states its dialect, and a pattern match
-- would be the code-suffix inference this replaces.
UPDATE courses SET dialect = 'north' WHERE course_code = 'cym_n_for_eng';
UPDATE courses SET dialect = 'south' WHERE course_code = 'cym_s_for_eng';

-- DELIBERATELY NOT TOUCHED: cym_for_yor and cym_anthem_for_jpn. Both are Welsh,
-- neither has a podCast, so every line of both is already counted as `uncast`
-- and belongs to nobody's queue either way. Which accent they teach is a content
-- question for whoever casts them, and guessing it here would be the inference
-- this whole change exists to stop. They keep the 'standard' default.

-- ── 2. Aran and Catrin are the NORTHERN voices ──────────────────────────────
--
-- A targeted jsonb merge, not a rewrite: the entries carry aliases that are the
-- only reason Aran's and Catrin's existing takes count as already recorded, and
-- replacing the object wholesale would ask them to re-record work they have
-- already given us. `||` on each entry adds the tag and leaves everything else
-- exactly as it was.
UPDATE language_recording_policy
SET voices = voices
      || jsonb_build_object('m', (voices -> 'm') || '{"dialect": "north"}'::jsonb)
      || jsonb_build_object('f', (voices -> 'f') || '{"dialect": "north"}'::jsonb),
    notes = 'No TTS Welsh voice we accept. Aran (m) and Catrin (f) record the NORTHERN courses. '
         || 'Dialect routing added 2026-08-19 (Tom): a voice only sees lines from a course whose '
         || 'own dialect matches its tag, so cym_s_for_eng can be cast to Southern voices without '
         || 'their lines landing here.'
WHERE language = 'cym'
  AND voices ? 'm' AND voices ? 'f';

-- ── 3. what is NOT done here, on purpose ────────────────────────────────────
--
-- The Southern slots ('m:south', 'f:south') are NOT created. Mali and Richard
-- are real people who have no voice id anywhere in this estate yet, and minting
-- one on their behalf would put a live recording link into existence for a
-- person who has not been given it — a link IS the identity on this surface.
-- The mechanism is now in place and the slots are one PUT away:
--
--   PUT /api/recording/languages/cym
--   { "voices": { ...the two Northern entries unchanged...,
--                 "m:south": {"voiceId": "human_<name>_cym_s", "name": "...",
--                             "email": "...", "dialect": "south"},
--                 "f:south": {"voiceId": "human_<name>_cym_s", "name": "...",
--                             "email": "...", "dialect": "south"} } }
--
-- Until then the Southern lines sit in a bucket no voice claims, and the
-- coverage bar reports them as `unrouted` rather than absorbing them into a
-- Northern total — visible, counted, and waiting for a human to cast them,
-- which is the same shape `uncast` already has.
--
-- ALSO NOT DONE: cym_s_for_eng's own podCast is left empty, as Kai left it on
-- 2026-08-19. It no longer HAS to be empty — the dialect filter, not the empty
-- cast, is what keeps Southern lines out of Northern queues now — but restoring
-- it is a casting decision with a snapshot of its own
-- (docs/cym_s_for_eng.voice_config.before-2026-08-19.json) and it is not this
-- change's to make. Note that until it is restored the Southern lines have no
-- gender either, so they count as `uncast`, not `unrouted`.
