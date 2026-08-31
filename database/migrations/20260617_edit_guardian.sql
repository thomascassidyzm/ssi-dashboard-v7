-- Edit Guardian — persistence for background edit review.
-- Two tables:
--   edit_review_jobs    — durable debounced queue (survives restarts)
--   course_edit_reviews — the human-facing review record + undo handle
--
-- Auto-fixes themselves are NOT stored here — they go through the course-editor
-- and are captured by content_audit_log (the undo runway). course_edit_reviews
-- stores the fix BATCH ID so the Maintenance page can revert a whole review.

-- ---------------------------------------------------------------------------
-- Durable queue. The in-process GuardianQueue handles debounce/coalesce/
-- concurrency; this table makes jobs survive a process restart.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS edit_review_jobs (
  id            BIGSERIAL PRIMARY KEY,
  course_code   TEXT NOT NULL,
  table_name    TEXT NOT NULL,
  primary_key   TEXT NOT NULL,
  before_row    JSONB,
  after_row     JSONB,
  edited_by     TEXT,
  enqueued_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  run_after     TIMESTAMPTZ NOT NULL DEFAULT now(),   -- debounce horizon
  status        TEXT NOT NULL DEFAULT 'pending',       -- pending|running|done|error
  attempts      INT NOT NULL DEFAULT 0,
  last_error    TEXT,
  -- one OPEN job per item → coalescing at the DB level too
  CONSTRAINT edit_review_jobs_status_chk CHECK (status IN ('pending','running','done','error'))
);

-- Coalesce: at most one pending/running job per (course, table, pk).
CREATE UNIQUE INDEX IF NOT EXISTS uq_edit_review_jobs_open
  ON edit_review_jobs (course_code, table_name, primary_key)
  WHERE status IN ('pending','running');

CREATE INDEX IF NOT EXISTS idx_edit_review_jobs_runnable
  ON edit_review_jobs (status, run_after);

-- ---------------------------------------------------------------------------
-- Review record — what the guardian found + decided, for human sanity-check.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS course_edit_reviews (
  id                BIGSERIAL PRIMARY KEY,
  course_code       TEXT NOT NULL,
  table_name        TEXT NOT NULL,
  primary_key       TEXT NOT NULL,
  edited_by         TEXT,
  before_row        JSONB,
  after_row         JSONB,
  -- agent judgment
  verdict           TEXT,        -- looks_good | possible_mistake | clear_mistake
  confidence        REAL,
  reasoning         TEXT,
  -- deterministic findings (impact report, cross-course audio, parallel courses)
  findings          JSONB,
  -- what the guardian auto-applied (links to content_audit_log via batch)
  applied_fix_batch_id TEXT,
  zut_fix_batch_id  TEXT,        -- ZUT resolution applied as its own batch
  applied_fix_count INT NOT NULL DEFAULT 0,
  -- things needing a human
  flags             JSONB,       -- [{severity, message, items}]
  urgent            BOOLEAN NOT NULL DEFAULT false,  -- ping the human now (e.g. unresolved ZUT)
  -- human triage
  status            TEXT NOT NULL DEFAULT 'open',   -- open | reviewed | dismissed
  reviewed_by       TEXT,
  reviewed_at       TIMESTAMPTZ,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT course_edit_reviews_status_chk CHECK (status IN ('open','reviewed','dismissed')),
  CONSTRAINT course_edit_reviews_verdict_chk CHECK (verdict IS NULL OR verdict IN ('looks_good','possible_mistake','clear_mistake'))
);

CREATE INDEX IF NOT EXISTS idx_course_edit_reviews_course ON course_edit_reviews (course_code, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_course_edit_reviews_open ON course_edit_reviews (status) WHERE status = 'open';
-- Surface mistakes first.
CREATE INDEX IF NOT EXISTS idx_course_edit_reviews_verdict ON course_edit_reviews (verdict) WHERE verdict <> 'looks_good';
-- Urgent items (e.g. unresolved ZUT) for the "ping me now" feed.
CREATE INDEX IF NOT EXISTS idx_course_edit_reviews_urgent ON course_edit_reviews (urgent, created_at DESC) WHERE urgent;
