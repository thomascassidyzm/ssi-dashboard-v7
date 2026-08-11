-- 2026-08-11 — seed_redo_snapshots: before-image store for destructive seed rebuilds.
--
-- Why: POST /api/build/redo/:courseCode (the text-generation tab's "redo seed"
-- button and the "redo seed N" chat command) deleted a seed's course_legos and
-- course_practice_phrases rows before the rebuild agent was even briefed, with
-- nothing capturing them first. If the redo came back worse, the old
-- decomposition was gone; and the rebuild agent never saw what it was replacing,
-- so a note like "make this less formal" had no "this" to act on.
--
-- content_audit_log DOES capture the deleted rows (AFTER DELETE triggers on both
-- tables), but it is not a usable undo: no grouping key ties one redo's rows
-- together, and archive-audit-log.cjs prunes it to a ~14-day hot window. This
-- table is the grouped, addressable before-image an undo can actually be built on.
--
-- One row per (redo batch, seed). Snapshot is written BEFORE any delete; the
-- delete does not proceed if the snapshot fails.

CREATE TABLE IF NOT EXISTS seed_redo_snapshots (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id      uuid NOT NULL,               -- one redo/rebuild request → one batch
  course_code   text NOT NULL,
  seed_number   integer NOT NULL,
  reason        text NOT NULL DEFAULT 'redo', -- 'redo' | 'rebuild-range'
  notes         text,                        -- the human's redo comment, verbatim
  seed_row      jsonb NOT NULL DEFAULT '{}'::jsonb, -- seed text + decomposed_at/approved_at/flagged_at
  legos         jsonb NOT NULL DEFAULT '[]'::jsonb, -- full course_legos rows, lego_index order
  phrases       jsonb NOT NULL DEFAULT '[]'::jsonb, -- full course_practice_phrases rows
  lego_count    integer NOT NULL DEFAULT 0,
  phrase_count  integer NOT NULL DEFAULT 0,
  created_at    timestamptz NOT NULL DEFAULT now(),
  restored_at   timestamptz,
  restored_by   text
);

CREATE INDEX IF NOT EXISTS idx_seed_redo_snapshots_seed
  ON seed_redo_snapshots (course_code, seed_number, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_seed_redo_snapshots_batch
  ON seed_redo_snapshots (batch_id);
CREATE INDEX IF NOT EXISTS idx_seed_redo_snapshots_created
  ON seed_redo_snapshots (created_at DESC);

ALTER TABLE seed_redo_snapshots ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'seed_redo_snapshots' AND policyname = 'Service role can manage seed_redo_snapshots'
  ) THEN
    CREATE POLICY "Service role can manage seed_redo_snapshots" ON seed_redo_snapshots
      TO service_role USING (true) WITH CHECK (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'seed_redo_snapshots' AND policyname = 'ssi_admin reads seed_redo_snapshots'
  ) THEN
    CREATE POLICY "ssi_admin reads seed_redo_snapshots" ON seed_redo_snapshots
      FOR SELECT USING (is_ssi_admin());
  END IF;
END $$;

COMMENT ON TABLE seed_redo_snapshots IS
  'Before-images of a seed''s decomposition, written before /api/build/redo (and /build/rebuild) delete it. Restored by POST /api/build/redo-undo/:courseCode.';
