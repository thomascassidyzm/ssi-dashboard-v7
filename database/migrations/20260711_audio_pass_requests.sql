-- Audio pass request queue — content-pass tooling ends by QUEUEING an audio
-- pass (never running one: TTS is approval-gated) so text added/edited by a
-- pass can't silently accumulate as a missing-audio backlog (the ita/spa
-- 2026-07 backlog was exactly this: content passes on 07-07, no audio pass).
--
-- One PENDING row per course (partial unique index): a second queue call for
-- the same course just touches the existing request's metadata/timestamps.
-- phase8's /generate marks a course's pending requests fulfilled when a pass
-- completes. Helper: services/shared/audio-pass-queue.cjs.

CREATE TABLE IF NOT EXISTS audio_pass_requests (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_code   text NOT NULL,
  reason        text NOT NULL,              -- which pass queued it, human-readable
  requested_by  text,                       -- agent/tool identifier
  status        text NOT NULL DEFAULT 'pending',  -- pending | fulfilled | dismissed
  metadata      jsonb NOT NULL DEFAULT '{}'::jsonb, -- e.g. {"rowsTouched": 123}
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),
  fulfilled_at  timestamptz,
  fulfilled_by  text
);

CREATE UNIQUE INDEX IF NOT EXISTS audio_pass_requests_one_pending_per_course
  ON audio_pass_requests (course_code) WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS audio_pass_requests_status_idx
  ON audio_pass_requests (status, created_at);
