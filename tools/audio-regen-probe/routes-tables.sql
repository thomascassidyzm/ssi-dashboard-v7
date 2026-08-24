-- ---------------------------------------------------------------------------
-- Addendum to schema.sql for the REPLACEMENT-ROUTE probe.
--
-- schema.sql is a verbatim pg_get_functiondef/pg_dump of the audio-identity
-- core and is left untouched. These four tables are the ones the flag route
-- and the repair route write to, and they are NOT part of the linking core, so
-- they live here rather than being spliced into the dump.
--
-- Column lists and defaults were read out of the LIVE database on 2026-08-18
-- via information_schema.columns (scripts/kai-audio-routes/ddl.cjs, read-only
-- transaction). The ON DELETE actions were read from pg_constraint in the same
-- pass: every one of these four is ON DELETE CASCADE from course_audio, which
-- is the point test R7 makes.
-- ---------------------------------------------------------------------------

-- The flag store /regenerate-single reads and writes (phase8:4472, :4600-4625).
-- NOTE: `audio_uuid` is text, not uuid, and there is no FK to course_audio on
-- it — verbatim from live.
CREATE TABLE audio_flags (
  id          serial PRIMARY KEY,
  audio_uuid  text NOT NULL,
  course_code text NOT NULL,
  status      text NOT NULL DEFAULT 'flagged',
  reason      text,
  flagged_by  text DEFAULT 'qa',
  created_at  timestamptz DEFAULT now(),
  resolved_at timestamptz,
  regen_count integer DEFAULT 0
);

-- The SECOND flag table. audio_clip_flags DOES have a real FK, ON DELETE
-- CASCADE — so deleting a clip destroys its flag history, while
-- /regenerate-single's audio_flags rows survive as orphans. Both live.
CREATE TABLE audio_clip_flags (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  audio_id   uuid NOT NULL REFERENCES course_audio(id) ON DELETE CASCADE,
  reason     text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- audio-repair-core.cjs `propose` writes here (:342-355).
CREATE TABLE audio_repair_candidates (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  audio_id         uuid NOT NULL REFERENCES course_audio(id) ON DELETE CASCADE,
  course_code      text NOT NULL,
  source           text NOT NULL,
  status           text NOT NULL DEFAULT 'pending',
  s3_key           text NOT NULL,
  text             text NOT NULL,
  voice_id         text NOT NULL,
  duration_ms      integer,
  file_size_bytes  integer,
  veracity_checked boolean,
  veracity_pass    boolean,
  veracity_reason  text,
  veracity_cer     real,
  mean_db          real,
  peak_db          real,
  proposed_by      text NOT NULL DEFAULT 'unknown',
  proposed_at      timestamptz NOT NULL DEFAULT now(),
  decided_by       text,
  decided_at       timestamptz,
  decision_reason  text,
  notes            jsonb
);

-- audio-repair-core.cjs `accept` writes here (:558-570) and `revert` reads it
-- (:703). This is the only undo record any replacement route keeps.
CREATE TABLE course_audio_revisions (
  id                   bigserial PRIMARY KEY,
  audio_id             uuid NOT NULL REFERENCES course_audio(id) ON DELETE CASCADE,
  course_code          text NOT NULL,
  revision             integer NOT NULL,
  previous_revision    integer NOT NULL,
  previous_s3_key      text NOT NULL,
  new_s3_key           text NOT NULL,
  previous_duration_ms integer,
  new_duration_ms      integer,
  candidate_id         uuid,
  source               text,
  accepted_by          text NOT NULL,
  reason               text,
  created_at           timestamptz NOT NULL DEFAULT now(),
  -- FIDELITY: live carries this as course_audio_revisions_audio_id_revision_key.
  -- It is load-bearing for the versioned-swap tests: it is the constraint that
  -- turns an interrupted swap into the 2026-08-08 poison pill, and the reason
  -- the history write is an UPSERT rather than an INSERT. Without it here the
  -- retry test passes for the wrong reason.
  UNIQUE (audio_id, revision)
);

-- ---------------------------------------------------------------------------
-- FIDELITY GAP IN THE INHERITED FIXTURE, CLOSED HERE.
--
-- schema.sql declares course_legos.target1_audio_id etc. as bare `uuid` with NO
-- foreign key to course_audio. The live database has 11 of them, every one
-- `ON DELETE SET NULL` (pg_constraint, read 2026-08-18 — see
-- scripts/kai-audio-routes/fk.cjs). That omission is harmless for the unlink
-- route, which never deletes a row; it is load-bearing for the DELETE route,
-- where without the FK a deleted clip leaves a DANGLING id behind instead of a
-- NULL, and the slot is then invisible to getAudioNeeds (which keys on IS NULL).
--
-- Added by ALTER rather than by editing schema.sql, so the existing 14 tests
-- keep running against the exact fixture they were written for: only
-- createRouteFixture() gets these constraints.
-- ---------------------------------------------------------------------------
ALTER TABLE course_legos
  ADD FOREIGN KEY (known_audio_id)   REFERENCES course_audio(id) ON DELETE SET NULL,
  ADD FOREIGN KEY (target1_audio_id) REFERENCES course_audio(id) ON DELETE SET NULL,
  ADD FOREIGN KEY (target2_audio_id) REFERENCES course_audio(id) ON DELETE SET NULL;
ALTER TABLE course_seeds
  ADD FOREIGN KEY (known_audio_id)   REFERENCES course_audio(id) ON DELETE SET NULL,
  ADD FOREIGN KEY (target1_audio_id) REFERENCES course_audio(id) ON DELETE SET NULL,
  ADD FOREIGN KEY (target2_audio_id) REFERENCES course_audio(id) ON DELETE SET NULL;
ALTER TABLE course_practice_phrases
  ADD FOREIGN KEY (known_audio_id)        REFERENCES course_audio(id) ON DELETE SET NULL,
  ADD FOREIGN KEY (target1_audio_id)      REFERENCES course_audio(id) ON DELETE SET NULL,
  ADD FOREIGN KEY (target2_audio_id)      REFERENCES course_audio(id) ON DELETE SET NULL,
  ADD FOREIGN KEY (presentation_audio_id) REFERENCES course_audio(id) ON DELETE SET NULL;

-- Present so R7 can show what a DELETE does to a presentation clip's intro row.
-- LIVE ON DELETE action is SET NULL, NOT the CASCADE that audio-repair-core.cjs's
-- header comment (:26) asserts — checked against pg_constraint 2026-08-18.
CREATE TABLE lego_introductions (
  id                     uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_code            text NOT NULL,
  lego_id                text NOT NULL,
  presentation_audio_id  uuid REFERENCES course_audio(id) ON DELETE SET NULL,
  intro_script           text,
  version                integer NOT NULL DEFAULT 1
);
