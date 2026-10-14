-- No re-recording without Tom's permission (Tom 2026-10-11, r-2026-10-11: "there shouldn't be any
-- re-recording done without express permission by me."). The TTS door (services/shared/rerecord-gate.cjs)
-- refuses any render that would replace a usable clip unless a row here, signed by Tom and in date,
-- covers the course (and the clip's role). Every refusal and every permitted re-record is logged.
-- Additive. Rollback: 20261011-tts-rerecord-permissions.ROLLBACK.sql
CREATE TABLE IF NOT EXISTS public.tts_rerecord_permissions (
  id          bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  at          timestamptz NOT NULL DEFAULT now(),
  course_code text NOT NULL,
  roles       text[],                 -- NULL = every role in the course
  by          text NOT NULL,          -- must start "Tom" to count
  why         text NOT NULL,          -- Tom's words
  until       timestamptz NOT NULL,   -- at most 31 days after `at`
  max_clips   integer CHECK (max_clips IS NULL OR max_clips > 0),
  revoked_at  timestamptz
);
CREATE INDEX IF NOT EXISTS tts_rerecord_permissions_course ON public.tts_rerecord_permissions (course_code);

CREATE TABLE IF NOT EXISTS public.tts_rerecord_log (
  id                 bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  at                 timestamptz NOT NULL DEFAULT now(),
  kind               text NOT NULL CHECK (kind IN ('refused', 'permitted')),
  permission_id      bigint REFERENCES public.tts_rerecord_permissions(id),
  course_code        text,
  role               text,
  language           text,
  voice_id           text,
  text               text,
  replaced_audio_ids uuid[],
  origin             text,            -- the chain origin: which route/tool asked
  job                text,
  dry_run            boolean NOT NULL DEFAULT false,
  note               text
);
CREATE INDEX IF NOT EXISTS tts_rerecord_log_permission ON public.tts_rerecord_log (permission_id) WHERE permission_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS tts_rerecord_log_at ON public.tts_rerecord_log (at);

-- New tables arrive grant-open to anon on this project: close them. The door uses the service role.
REVOKE ALL ON public.tts_rerecord_permissions, public.tts_rerecord_log FROM PUBLIC, anon, authenticated;
ALTER TABLE public.tts_rerecord_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tts_rerecord_log ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE ON public.tts_rerecord_permissions, public.tts_rerecord_log TO service_role;
