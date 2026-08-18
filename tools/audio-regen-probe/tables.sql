-- Table DDL for the isolated fixture. Hand-authored, column names/types taken
-- from information_schema on the live DB (see .a74-scratch/regen-repro/schema-live2.txt).
-- Trimmed to the columns the audio-identity path reads or writes; enum columns
-- (course_legos.type, .status) are plain text here because their enum types are
-- irrelevant to clip identity.
--
-- NOT reproduced: course_audio.text_stripped (a GENERATED column live), the FKs
-- to audio_clips/courses beyond course_code, and every non-unique index.

CREATE TABLE language_canonical (
  raw       text PRIMARY KEY,
  canonical text NOT NULL
);

CREATE TABLE courses (
  course_code text PRIMARY KEY,
  known_lang  text,
  target_lang text,
  seed_count  integer
);

CREATE TABLE course_audio (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_code      text NOT NULL REFERENCES courses(course_code) ON DELETE CASCADE,
  text             text NOT NULL,
  text_normalized  text NOT NULL,
  language         text NOT NULL,
  role             text NOT NULL,
  voice_id         text NOT NULL,
  origin           text NOT NULL CHECK (origin = ANY (ARRAY['tts','human'])),
  s3_key           text NOT NULL,
  duration_ms      integer,
  file_size_bytes  integer,
  created_at       timestamptz NOT NULL DEFAULT now(),
  lego_id          text,
  word_boundaries  jsonb,
  sequence         integer,
  audio_revision   integer NOT NULL DEFAULT 1,
  clip_id          uuid,
  rerecord_wanted  jsonb
);

CREATE TABLE course_legos (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_code           text NOT NULL,
  seed_number           integer NOT NULL,
  lego_index            integer NOT NULL,
  lego_id               text,
  type                  text NOT NULL DEFAULT 'word',
  is_new                boolean NOT NULL DEFAULT true,
  known_text            text,
  target_text           text NOT NULL,
  components            jsonb,
  status                text NOT NULL DEFAULT 'draft',
  version               integer NOT NULL DEFAULT 1,
  updated_at            timestamptz NOT NULL DEFAULT now(),
  created_at            timestamptz NOT NULL DEFAULT now(),
  known_audio_id        uuid,
  target1_audio_id      uuid,
  target2_audio_id      uuid,
  presentation_audio_id text,
  target1_duration_ms   integer,
  target2_duration_ms   integer
);

CREATE TABLE course_practice_phrases (
  id                    text PRIMARY KEY,
  course_code           text NOT NULL,
  seed_number           integer NOT NULL,
  lego_index            integer NOT NULL,
  position              integer NOT NULL,
  known_text            text,
  target_text           text NOT NULL,
  word_count            integer NOT NULL DEFAULT 0,
  lego_count            integer NOT NULL DEFAULT 0,
  metadata              jsonb NOT NULL DEFAULT '{}'::jsonb,
  status                text NOT NULL DEFAULT 'draft',
  version               integer NOT NULL DEFAULT 1,
  updated_at            timestamptz NOT NULL DEFAULT now(),
  created_at            timestamptz NOT NULL DEFAULT now(),
  phrase_role           text NOT NULL DEFAULT 'practice',
  known_audio_id        uuid,
  target1_audio_id      uuid,
  target2_audio_id      uuid,
  target1_duration_ms   integer,
  target2_duration_ms   integer,
  lego_id               text,
  presentation_audio_id uuid,
  introduce             boolean NOT NULL DEFAULT true
);

CREATE TABLE course_seeds (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_code      text NOT NULL,
  seed_number      integer NOT NULL,
  known_text       text,
  target_text      text NOT NULL,
  status           text NOT NULL DEFAULT 'released',
  version          integer NOT NULL DEFAULT 1,
  known_audio_id   uuid,
  target1_audio_id uuid,
  target2_audio_id uuid
);

CREATE TABLE content_audio_link_drops (
  id            bigserial PRIMARY KEY,
  dropped_at    timestamptz NOT NULL DEFAULT now(),
  table_name    text NOT NULL,
  row_id        text NOT NULL,
  course_code   text NOT NULL,
  seed_number   integer,
  column_name   text NOT NULL,
  role          text NOT NULL,
  old_audio_id  uuid,
  new_audio_id  uuid,
  old_text      text,
  new_text      text,
  old_voice_id  text,
  reason        text NOT NULL,
  old_link_raw  text
);
