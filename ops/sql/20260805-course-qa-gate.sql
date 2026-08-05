-- Course QA / approval gate — schema (applied to the live DB 2026-08-05).
--
-- database/migrations is archived ("no new files go in this directory"); the
-- canonical record of DB state is ssi-learning-app/supabase/schema.sql. This
-- file is kept as the readable DDL behind the change, not as a migration to
-- be replayed. It follows ops/sql/20260805-audio-repair.sql, which is its
-- immediate neighbour and its source of clip-level truth.
--
-- ── WHY (2026-08-05, the evening of the deu_for_eng disaster) ───────────────
-- Tom played the first ten minutes of the live deu_for_eng course and found
-- it "an unmitigated disaster" — clipped audio, at the very start of a paid
-- course. A trim service had been mutating healthy clips on the word of a
-- detector whose measured precision was 9 percent. Worse, when the detector
-- DID flag the real damage, an agent overruled it as a transcription
-- artifact and cleared five of six damaged intros. The duration data later
-- proved every one of those flags real. Tom's ear was the instrument that
-- caught what the pipeline threw away.
--
-- Out of that, his ruling: "No course should EVER go out to learners unless
-- it has passed a manual approval gate." And the shape of that gate, in his
-- words: sampling is fine for the body of a course, but "we MUST manually
-- play through the first X ROUNDS" — X = 100 for paid courses, 20 for free.
--
-- Two laws are encoded structurally here, not left to convention:
--
--   1. MACHINES MAY FLAG AUDIO; ONLY HUMANS MAY PASS IT. A flag is cleared
--      by exactly two things — a recorded human action, or a repair that
--      replaced the bytes. `audio_clip_flags.resolution` has no third value,
--      so there is no column an automated re-judgement can write to. That is
--      the mistake of 2026-08-05 made unrepresentable.
--   2. A PASS IS AGAINST SPECIFIC BYTES. Clip sign-off carries the
--      course_audio.audio_revision it was given against, and round sign-off
--      carries a fingerprint over every (audio_id, revision) in the round.
--      Accepting a repair bumps the revision, the fingerprint moves, and the
--      round's sign-off goes stale by arithmetic rather than by anyone
--      remembering to invalidate it.
--
-- ── The object model this sits on (do not re-invent it) ────────────────────
-- A ROUND is a LEGO. course_round_index.round_index -> lego_id is the map the
-- learning app itself walks (ssi-learning-app/api/courses/[code]/round-map.ts).
-- Position is the LEGO, never the seed — "SEED position does not EXIST"
-- (Tom, 2026-07-06), and nothing below names one.
--
-- A CYCLE is one item inside a round, and its key here is byte-identical to
-- the id the learner-facing API emits (api/courses/[code]/cycles.ts):
-- `<legoId>_intro`, `<legoId>_debut`, `<legoId>_build_<n>`, `<legoId>_use_<n>`.
-- Using the learner's own identifiers means a producer looking at a QA row
-- and a learner hitting a bad cycle are demonstrably talking about the same
-- thing.
--
-- Cycle and round verification status are DERIVED (views), never typed in.
-- Tom asked for "some way of identifying cycles that have had all their clips
-- checked"; a stored cycle status would be a second thing to keep true, and
-- would survive a clip being replaced underneath it. The only human actions
-- recorded are on clips and on rounds.

BEGIN;

-- Needed for the no-overlap exclusion constraint on round assignments below.
CREATE EXTENSION IF NOT EXISTS btree_gist;

-- ═══════════════════════════════════════════════════════════════════════════
-- 1. FLAGS — what a machine, or a human, has said is suspect about a clip
-- ═══════════════════════════════════════════════════════════════════════════
-- Raising a flag is cheap and touches nothing on the learner path. Clearing
-- one is the expensive, human act, and the CHECK on `resolution` is the whole
-- point of this table: there are two ways out and an agent's opinion is
-- neither of them.
CREATE TABLE IF NOT EXISTS audio_clip_flags (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  audio_id          uuid NOT NULL REFERENCES course_audio(id) ON DELETE CASCADE,
  course_code       text NOT NULL,

  -- The bytes that were flagged. If the clip is later replaced, the flag is
  -- about a revision that no longer serves — see the `resolution='replaced'`
  -- path and course_qa_clip_status below.
  audio_revision    integer NOT NULL DEFAULT 1,

  -- Who or what raised it. 'detector' = an automated check; 'veracity' = the
  -- existing course_audio.veracity_pass pipeline; 'human' = someone's ears.
  source            text NOT NULL CHECK (source IN ('detector', 'veracity', 'human')),
  detector          text,          -- which check, when source is automated
  severity          text NOT NULL DEFAULT 'suspect'
                      CHECK (severity IN ('suspect', 'bad')),
  reason            text NOT NULL,
  metrics           jsonb,         -- whatever the detector measured, verbatim

  -- The detector's own measured precision at the time it fired, where it is
  -- known. Carried alongside every flag on purpose: the 9-percent-precision
  -- trim service is the reason this column exists, and a queue that cannot
  -- show its own precision must never be mistaken for a verdict.
  detector_precision real,

  raised_by         text NOT NULL DEFAULT 'unknown',
  raised_at         timestamptz NOT NULL DEFAULT now(),

  -- ── The only two exits ──────────────────────────────────────────────────
  -- 'cleared_by_human'  a person listened and said it is fine.
  -- 'replaced'          the bytes were replaced by an accepted repair, so
  --                     the flag is about audio that no longer exists.
  -- There is deliberately no 'cleared_by_agent'. An agent may never overrule
  -- a detector's flag; on 2026-08-05 one did, and it cost the course.
  resolution        text CHECK (resolution IN ('cleared_by_human', 'replaced')),
  resolved_by       text,
  resolved_at       timestamptz,
  resolution_reason text,

  -- Belt and braces: a resolution must name a human (or the repair flow) and
  -- a time. A half-written resolution cannot silently count as cleared.
  CONSTRAINT audio_clip_flags_resolution_complete CHECK (
    (resolution IS NULL AND resolved_by IS NULL AND resolved_at IS NULL)
    OR (resolution IS NOT NULL AND resolved_by IS NOT NULL AND resolved_at IS NOT NULL)
  )
);

CREATE INDEX IF NOT EXISTS idx_audio_clip_flags_open
  ON audio_clip_flags (course_code, audio_id) WHERE resolution IS NULL;
CREATE INDEX IF NOT EXISTS idx_audio_clip_flags_audio
  ON audio_clip_flags (audio_id, raised_at DESC);

COMMENT ON TABLE audio_clip_flags IS
  'Suspicion about a clip, from a machine or a human. Cleared only by a recorded human action or by a repair that replaced the bytes — there is no automated exit, by design (2026-08-05).';
COMMENT ON COLUMN audio_clip_flags.detector_precision IS
  'Measured precision of the raising detector, where known. A check with no measured miss rate against human-labelled ground truth may only ORDER THE QUEUE FOR HUMAN EARS; it may never pass audio on its own authority.';

-- ═══════════════════════════════════════════════════════════════════════════
-- 2. CLIP SIGN-OFF — a human heard these exact bytes and passed them
-- ═══════════════════════════════════════════════════════════════════════════
-- Keyed on (audio_id, audio_revision), so a pass is a statement about bytes,
-- not about a row. Replace the bytes and the pass simply does not apply to
-- the new revision — nothing has to be invalidated because nothing was ever
-- claimed about audio that did not exist yet.
CREATE TABLE IF NOT EXISTS audio_clip_signoffs (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  audio_id       uuid NOT NULL REFERENCES course_audio(id) ON DELETE CASCADE,
  course_code    text NOT NULL,
  audio_revision integer NOT NULL,
  signed_off_by  text NOT NULL,
  signed_off_at  timestamptz NOT NULL DEFAULT now(),
  -- How the human came to hear it: in the real player during a round
  -- play-through, or clip-by-clip in the repair panel.
  context        text NOT NULL DEFAULT 'playthrough'
                   CHECK (context IN ('playthrough', 'repair_panel', 'spot_check')),
  notes          text,
  UNIQUE (audio_id, audio_revision)
);

CREATE INDEX IF NOT EXISTS idx_audio_clip_signoffs_course
  ON audio_clip_signoffs (course_code, signed_off_at DESC);

COMMENT ON TABLE audio_clip_signoffs IS
  'A human pass on one clip at one revision. Machines may flag audio; only humans may pass it.';

-- ═══════════════════════════════════════════════════════════════════════════
-- 3. ROUND SIGN-OFF — a human played this round in the real app
-- ═══════════════════════════════════════════════════════════════════════════
-- This is the gate's actual currency. One row per (course, round); re-signing
-- upserts it, because a superseded verdict is not evidence of anything and
-- the actionable history lives in audio_clip_flags where it can be worked.
CREATE TABLE IF NOT EXISTS course_round_signoffs (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_code      text NOT NULL REFERENCES courses(course_code) ON DELETE CASCADE,
  round_index      integer NOT NULL,
  lego_id          text NOT NULL,   -- denormalised: the round IS this LEGO

  verdict          text NOT NULL CHECK (verdict IN ('passed', 'flagged')),
  notes            text,

  signed_off_by    text NOT NULL,
  signed_off_at    timestamptz NOT NULL DEFAULT now(),

  -- What was signed off against. courses.version is bumped by trigger on
  -- content mutation; audio_fingerprint is md5 over every (audio_id,
  -- revision) the round references, in cycle order. Either moving means the
  -- human passed something that is no longer what a learner would hear.
  content_version  integer NOT NULL,
  audio_fingerprint text NOT NULL,

  UNIQUE (course_code, round_index)
);

CREATE INDEX IF NOT EXISTS idx_course_round_signoffs_course
  ON course_round_signoffs (course_code, round_index);

COMMENT ON TABLE course_round_signoffs IS
  'A human played this round through in the REAL learning app and recorded a verdict. The unit is the round, which is the LEGO — there is no such thing as a seed position.';
COMMENT ON COLUMN course_round_signoffs.audio_fingerprint IS
  'md5 over the (audio_id, audio_revision) pairs of every clip the round references, in cycle order. Accepting a repair bumps a revision, the fingerprint moves, and this sign-off goes stale arithmetically rather than by anyone remembering to invalidate it.';

-- ═══════════════════════════════════════════════════════════════════════════
-- 4. ROUND ASSIGNMENT — how 100 rounds of listening gets divided
-- ═══════════════════════════════════════════════════════════════════════════
-- Tom named the constraint himself: "this is a human cost in terms of time."
-- The exclusion constraint is what makes "two people must never silently be
-- handed the same rounds" a fact about the database rather than a hope about
-- the UI. Ranges are half-open int4ranges: [start, end).
CREATE TABLE IF NOT EXISTS course_round_assignments (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_code  text NOT NULL REFERENCES courses(course_code) ON DELETE CASCADE,
  rounds       int4range NOT NULL,
  assignee     text NOT NULL,
  assigned_by  text NOT NULL,
  assigned_at  timestamptz NOT NULL DEFAULT now(),
  -- Releasing is how a range is given back. Released rows stay for the
  -- record and stop constraining, which is why the exclusion is partial.
  released_at  timestamptz,
  released_reason text,

  CONSTRAINT course_round_assignments_nonempty CHECK (NOT isempty(rounds)),
  CONSTRAINT course_round_assignments_no_overlap
    EXCLUDE USING gist (course_code WITH =, rounds WITH &&)
    WHERE (released_at IS NULL)
);

CREATE INDEX IF NOT EXISTS idx_course_round_assignments_open
  ON course_round_assignments (course_code, assignee) WHERE released_at IS NULL;

COMMENT ON TABLE course_round_assignments IS
  'Claim-a-range, so play-through work divides between team members. The partial exclusion constraint makes double-assignment impossible rather than merely discouraged.';

-- ═══════════════════════════════════════════════════════════════════════════
-- 5. THE GATE ITSELF — one row per course
-- ═══════════════════════════════════════════════════════════════════════════
-- Every existing course starts UNPASSED, honestly. Tom: "all our courses are
-- ALREADY published... we can't ever pull them back in." Nothing here flips
-- anyone's new_app_status; the gate records the truth and the publish path
-- (services/api/course-qa-gate-routes.cjs) is where it starts to bite.
CREATE TABLE IF NOT EXISTS course_qa_gate (
  course_code     text PRIMARY KEY REFERENCES courses(course_code) ON DELETE CASCADE,

  gate_status     text NOT NULL DEFAULT 'unpassed'
                    CHECK (gate_status IN ('unpassed', 'in_progress', 'passed')),

  -- X: how many rounds a human must play through. Per course, seeded from
  -- pricing_tier (premium 100, free/community 20) but stored, not computed,
  -- so it can be raised or lowered for one course without a code change.
  required_rounds integer NOT NULL DEFAULT 20 CHECK (required_rounds >= 0),

  passed_by       text,
  passed_at       timestamptz,
  -- The content version the gate was passed against, so "passed, but the
  -- course has moved since" is answerable.
  passed_version  integer,

  -- An explicit override exists because a hard block with no escape hatch
  -- gets worked around in ways nobody records. This one is recorded.
  override_by     text,
  override_reason text,
  override_at     timestamptz,

  notes           text,
  updated_at      timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT course_qa_gate_override_complete CHECK (
    (override_by IS NULL AND override_at IS NULL AND override_reason IS NULL)
    OR (override_by IS NOT NULL AND override_at IS NOT NULL
        AND override_reason IS NOT NULL AND length(btrim(override_reason)) > 0)
  )
);

COMMENT ON TABLE course_qa_gate IS
  'The manual approval gate. No course goes to learners without a human play-through of its first `required_rounds` rounds (Tom, 2026-08-05). Existing courses start unpassed and are retrofitted by priority as human time allows.';
COMMENT ON COLUMN course_qa_gate.required_rounds IS
  'X, per Tom: 100 for paid courses, 20 for free. Stored per course, seeded from pricing_tier, never hard-coded to a single number.';
COMMENT ON COLUMN course_qa_gate.override_reason IS
  'An override must say why, in words, and name who. There is no silent override flag.';

-- Seed one row per existing course, honestly unpassed, with X from the tier.
-- 'community' counts as free for X (taste-safe default, 2026-08-05).
INSERT INTO course_qa_gate (course_code, gate_status, required_rounds)
SELECT course_code,
       'unpassed',
       CASE WHEN pricing_tier = 'premium' THEN 100 ELSE 20 END
FROM courses
ON CONFLICT (course_code) DO NOTHING;

-- ═══════════════════════════════════════════════════════════════════════════
-- 6. DERIVED VIEWS — cycle and round status, computed, never typed in
-- ═══════════════════════════════════════════════════════════════════════════

-- 6a. Every clip every cycle references, keyed by the learner-facing cycle id.
--     Mirrors api/courses/[code]/cycles.ts exactly: intro carries the
--     presentation plus both target voices and NO known audio (the prompt is
--     the presentation itself); debut carries known + both targets; each
--     BUILD/USE phrase is its own cycle, ordinal-numbered within its role in
--     `position` order, exactly as the API numbers them.
CREATE OR REPLACE VIEW course_qa_cycle_clips AS
WITH lego_cycles AS (
  SELECT l.course_code, l.lego_id, l.seed_number, l.lego_index,
         c.cycle_type, c.cycle_ordinal, c.audio_id, c.audio_role
  FROM course_legos l
  LEFT JOIN lego_introductions li
    ON li.course_code = l.course_code AND li.lego_id = l.lego_id
  CROSS JOIN LATERAL (VALUES
    -- INTRO
    ('intro'::text, 0, COALESCE(
        li.presentation_audio_id,
        CASE WHEN l.presentation_audio_id ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
             THEN l.presentation_audio_id::uuid END), 'presentation'::text),
    ('intro', 0, l.target1_audio_id, 'target1'),
    ('intro', 0, l.target2_audio_id, 'target2'),
    -- DEBUT
    ('debut', 0, l.known_audio_id,   'known'),
    ('debut', 0, l.target1_audio_id, 'target1'),
    ('debut', 0, l.target2_audio_id, 'target2')
  ) AS c(cycle_type, cycle_ordinal, audio_id, audio_role)
),
-- The ordinal must be numbered over PHRASES, before the audio roles are
-- fanned out — numbering after the fan-out would make one BUILD phrase look
-- like three BUILD cycles, which is not what a learner plays.
phrase_numbered AS (
  SELECT p.course_code, p.seed_number, p.lego_index, p.position,
         p.known_audio_id, p.target1_audio_id, p.target2_audio_id,
         CASE WHEN p.phrase_role = 'use' THEN 'use' ELSE 'build' END AS cycle_type,
         ROW_NUMBER() OVER (
           PARTITION BY p.course_code, p.seed_number, p.lego_index,
                        CASE WHEN p.phrase_role = 'use' THEN 'use' ELSE 'build' END
           ORDER BY p.position
         )::integer AS cycle_ordinal
  FROM course_practice_phrases p
  -- 'component' rows are tiling glosses, not cycles — the player skips them
  -- at runtime, so they are not part of what a human plays through.
  WHERE p.phrase_role IN ('build', 'practice', 'use')
),
phrase_cycles AS (
  SELECT pn.course_code, l.lego_id, pn.seed_number, pn.lego_index,
         pn.cycle_type, pn.cycle_ordinal, c.audio_id, c.audio_role
  FROM phrase_numbered pn
  JOIN course_legos l
    ON l.course_code = pn.course_code
   AND l.seed_number = pn.seed_number
   AND l.lego_index  = pn.lego_index
  CROSS JOIN LATERAL (VALUES
    (pn.known_audio_id,   'known'::text),
    (pn.target1_audio_id, 'target1'),
    (pn.target2_audio_id, 'target2')
  ) AS c(audio_id, audio_role)
)
SELECT course_code, lego_id, seed_number, lego_index,
       lego_id || '_' || cycle_type
         || CASE WHEN cycle_type IN ('build', 'use')
                 THEN '_' || cycle_ordinal::text ELSE '' END AS cycle_key,
       cycle_type, cycle_ordinal, audio_id, audio_role
FROM (
  SELECT * FROM lego_cycles
  UNION ALL
  SELECT * FROM phrase_cycles
) u
WHERE audio_id IS NOT NULL;

COMMENT ON VIEW course_qa_cycle_clips IS
  'Every clip every cycle references, under the SAME cycle key the learner-facing API emits (api/courses/[code]/cycles.ts). Clips with no audio row are absent, which is why course_qa_cycle_status counts them separately as a hole rather than as a pass.';

-- 6b. Per-clip status. Three states and no fourth:
--       flagged     — at least one unresolved flag against the live bytes
--       passed      — a human signed off THIS revision and nothing is open
--       unverified  — nobody has listened to these bytes yet
--     A flag raised against a superseded revision does not hold the clip
--     down: accepting a repair is one of the two legitimate exits, and the
--     repair flow marks it 'replaced'. A flag left open against an older
--     revision is treated as stale and reported, not silently honoured.
CREATE OR REPLACE VIEW course_qa_clip_status AS
SELECT a.course_code,
       a.id   AS audio_id,
       a.role AS audio_role,
       a.audio_revision,
       COALESCE(f.open_flags, 0)      AS open_flags,
       COALESCE(f.stale_flags, 0)     AS stale_flags,
       (s.id IS NOT NULL)             AS human_passed,
       s.signed_off_by,
       s.signed_off_at,
       CASE
         WHEN COALESCE(f.open_flags, 0) > 0 THEN 'flagged'
         WHEN s.id IS NOT NULL              THEN 'passed'
         ELSE 'unverified'
       END AS status
FROM course_audio a
LEFT JOIN LATERAL (
  SELECT count(*) FILTER (WHERE fl.audio_revision >= a.audio_revision) AS open_flags,
         count(*) FILTER (WHERE fl.audio_revision <  a.audio_revision) AS stale_flags
  FROM audio_clip_flags fl
  WHERE fl.audio_id = a.id AND fl.resolution IS NULL
) f ON true
LEFT JOIN audio_clip_signoffs s
  ON s.audio_id = a.id AND s.audio_revision = a.audio_revision;

-- 6c. Per-cycle status — Tom's "cycles that have had all their clips checked
--     through the whole verification process". Derived, so it drops back the
--     moment any clip in it is flagged or replaced.
CREATE OR REPLACE VIEW course_qa_cycle_status AS
SELECT cc.course_code, cc.lego_id, cc.seed_number, cc.lego_index,
       cc.cycle_key, cc.cycle_type, cc.cycle_ordinal,
       count(*)                                                    AS clip_count,
       count(*) FILTER (WHERE cs.status = 'passed')                AS passed_clips,
       count(*) FILTER (WHERE cs.status = 'flagged')               AS flagged_clips,
       count(*) FILTER (WHERE cs.status = 'unverified')            AS unverified_clips,
       CASE
         WHEN count(*) FILTER (WHERE cs.status = 'flagged') > 0 THEN 'flagged'
         WHEN count(*) FILTER (WHERE cs.status <> 'passed') = 0 THEN 'verified'
         ELSE 'unverified'
       END AS status
FROM course_qa_cycle_clips cc
JOIN course_qa_clip_status cs ON cs.audio_id = cc.audio_id
GROUP BY cc.course_code, cc.lego_id, cc.seed_number, cc.lego_index,
         cc.cycle_key, cc.cycle_type, cc.cycle_ordinal;

-- 6d. Per-round status — cycle rollup plus the human play-through verdict,
--     plus whether that verdict still applies to what a learner would hear.
CREATE OR REPLACE VIEW course_qa_round_status AS
SELECT ri.course_code,
       ri.round_index,
       ri.lego_id,
       ri.seed_number,
       COALESCE(cy.cycle_count, 0)      AS cycle_count,
       COALESCE(cy.verified_cycles, 0)  AS verified_cycles,
       COALESCE(cy.flagged_cycles, 0)   AS flagged_cycles,
       COALESCE(cl.clip_count, 0)       AS clip_count,
       COALESCE(cl.flagged_clips, 0)    AS flagged_clips,
       cl.fingerprint                   AS audio_fingerprint,
       so.verdict                       AS signoff_verdict,
       so.signed_off_by,
       so.signed_off_at,
       so.notes                         AS signoff_notes,
       -- A sign-off is CURRENT only while the bytes and the content version
       -- it was given against are still the ones on the learner path.
       (so.id IS NOT NULL
         AND so.audio_fingerprint = cl.fingerprint
         AND so.content_version = c.version) AS signoff_current,
       CASE
         WHEN so.id IS NULL THEN 'not_signed_off'
         WHEN so.audio_fingerprint IS DISTINCT FROM cl.fingerprint
           OR so.content_version IS DISTINCT FROM c.version THEN 'stale'
         WHEN so.verdict = 'flagged' THEN 'flagged'
         ELSE 'passed'
       END AS status,
       asg.assignee
FROM course_round_index ri
JOIN courses c ON c.course_code = ri.course_code
LEFT JOIN LATERAL (
  SELECT count(*) AS cycle_count,
         count(*) FILTER (WHERE cys.status = 'verified') AS verified_cycles,
         count(*) FILTER (WHERE cys.status = 'flagged')  AS flagged_cycles
  FROM course_qa_cycle_status cys
  WHERE cys.course_code = ri.course_code AND cys.lego_id = ri.lego_id
) cy ON true
LEFT JOIN LATERAL (
  SELECT count(*) AS clip_count,
         count(*) FILTER (WHERE cs.status = 'flagged') AS flagged_clips,
         md5(string_agg(cc.audio_id::text || ':' || cs.audio_revision::text,
                        ',' ORDER BY cc.cycle_type, cc.cycle_ordinal,
                                     cc.audio_role, cc.audio_id)) AS fingerprint
  FROM course_qa_cycle_clips cc
  JOIN course_qa_clip_status cs ON cs.audio_id = cc.audio_id
  WHERE cc.course_code = ri.course_code AND cc.lego_id = ri.lego_id
) cl ON true
LEFT JOIN course_round_signoffs so
  ON so.course_code = ri.course_code AND so.round_index = ri.round_index
LEFT JOIN course_round_assignments asg
  ON asg.course_code = ri.course_code
 AND asg.released_at IS NULL
 AND asg.rounds @> ri.round_index;

COMMENT ON VIEW course_qa_round_status IS
  'One row per round (= per LEGO) with the derived cycle rollup, the human play-through verdict, and whether that verdict is still current against the live bytes and content version.';

-- 6e. Estate view — Part 4. One row per course: what X is, how far sign-off
--     has got, and whether it is currently reaching learners. This is what
--     the retrofit is prioritised from.
--
--     ── Why this does NOT use course_qa_round_status ────────────────────────
--     The exact per-round view costs ~40ms for one course's 100-round window,
--     which is nothing on a course page and fatal across 143 courses at once
--     (it md5s every clip revision in every round of every course, including
--     the 668-round ones — it timed out outright when first written this way).
--
--     So the estate answers the same question with a cheaper, deliberately
--     CONSERVATIVE staleness test: a sign-off counts only if it was made
--     against the current courses.version AND after the most recent audio
--     replacement anywhere in that course. That is course-level rather than
--     round-level invalidation, so it can call a round stale whose own clips
--     were never touched. It errs toward "not signed off", never toward a
--     pass that is not real — which is the only direction a gate may err.
--
--     Nothing decides anything from these numbers. gate_status is computed by
--     services/course-qa-gate.cjs from the EXACT per-round view, scoped to one
--     course; this view is a progress display for prioritising the retrofit.
CREATE OR REPLACE VIEW course_qa_estate AS
SELECT c.course_code,
       c.display_name,
       c.pricing_tier,
       c.new_app_status,
       (c.new_app_status IN ('live', 'beta')) AS learner_visible,
       c.version AS content_version,
       g.gate_status,
       g.required_rounds,
       g.passed_by,
       g.passed_at,
       g.override_by,
       g.override_reason,
       COALESCE(r.total_rounds, 0)        AS total_rounds,
       COALESCE(r.signed_off_rounds, 0)   AS signed_off_rounds,
       COALESCE(r.flagged_rounds, 0)      AS flagged_rounds,
       COALESCE(r.stale_rounds, 0)        AS stale_rounds,
       -- How much of the REQUIRED window is done. This, not the whole
       -- course, is what the gate asks about.
       LEAST(COALESCE(r.total_rounds, 0), g.required_rounds) AS gate_window_rounds,
       COALESCE(fl.open_flag_clips, 0)    AS open_flag_clips
FROM courses c
LEFT JOIN course_qa_gate g ON g.course_code = c.course_code
-- Most recent in-place audio replacement anywhere in the course. Any
-- sign-off older than this is treated as stale, course-wide — see the note
-- above on why this is deliberately conservative.
LEFT JOIN LATERAL (
  SELECT max(cr.created_at) AS last_repair_at
  FROM course_audio_revisions cr WHERE cr.course_code = c.course_code
) rep ON true
LEFT JOIN LATERAL (
  SELECT (SELECT count(*) FROM course_round_index ri
           WHERE ri.course_code = c.course_code) AS total_rounds,
         count(*) FILTER (
           WHERE so.verdict = 'passed'
             AND so.content_version = c.version
             AND (rep.last_repair_at IS NULL OR so.signed_off_at >= rep.last_repair_at)
         ) AS signed_off_rounds,
         count(*) FILTER (WHERE so.verdict = 'flagged') AS flagged_rounds,
         count(*) FILTER (
           WHERE so.verdict = 'passed'
             AND (so.content_version <> c.version
                  OR (rep.last_repair_at IS NOT NULL AND so.signed_off_at < rep.last_repair_at))
         ) AS stale_rounds
  FROM course_round_signoffs so
  WHERE so.course_code = c.course_code
    AND so.round_index <= g.required_rounds
) r ON true
-- Flags that still bite. A flag raised against bytes that have since been
-- replaced by an accepted repair is about audio no longer on the learner
-- path, so it must not count here — services/audio-repair-core.cjs bumps
-- course_audio.audio_revision on every accept, which is what makes this
-- comparison the whole test. course_qa_clip_status applies the same rule.
LEFT JOIN LATERAL (
  SELECT count(DISTINCT f.audio_id) AS open_flag_clips
  FROM audio_clip_flags f
  JOIN course_audio a ON a.id = f.audio_id
  WHERE f.course_code = c.course_code
    AND f.resolution IS NULL
    AND f.audio_revision >= a.audio_revision
) fl ON true;

COMMENT ON VIEW course_qa_estate IS
  'The whole estate at a glance: which courses reach learners, what X is for each, and how far sign-off has got. Every course starts unpassed — nothing was grandfathered in (Tom, 2026-08-05).';

-- ═══════════════════════════════════════════════════════════════════════════
-- 7. RLS. Producer-side tables: no anon/authenticated read.
-- ═══════════════════════════════════════════════════════════════════════════
ALTER TABLE audio_clip_flags         ENABLE ROW LEVEL SECURITY;
ALTER TABLE audio_clip_signoffs      ENABLE ROW LEVEL SECURITY;
ALTER TABLE course_round_signoffs    ENABLE ROW LEVEL SECURITY;
ALTER TABLE course_round_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE course_qa_gate           ENABLE ROW LEVEL SECURITY;

COMMIT;
