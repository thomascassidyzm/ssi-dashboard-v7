-- canonical_script_versions — history for the Script Lab's line editor.
--
-- The Script Lab (popty.app/canonical/scripts) lets a human rewrite the
-- language-neutral English master a course flexes from. Until now that edit was
-- a straight UPDATE of canonical_pod_scenarios.english_text: no history, no
-- attribution, no way back. This table is the way back.
--
-- It follows the estate's proven copy-versioning shape (public.htw_copy_versions,
-- api/copy.js): APPEND-ONLY. Per scenario line there is one frozen 'original'
-- row holding the text as it stood before the first edit, plus one 'save' row
-- per edit. Nothing is ever overwritten and nothing is ever deleted — a restore
-- APPENDS a new save carrying an older row's words, so rolling back twice can
-- never bury the value you were comparing against.
--
-- Additive only: canonical_pod_scenarios itself is untouched. It stays the
-- single place the generator reads the live text from; this table is the
-- history beside it.
--
-- NOTE ON THE KEY: canonical_pod_scenarios.id is TEXT (e.g. 'pod-0-s01-04'),
-- not a uuid. scenario_id is therefore text, and deliberately carries NO foreign
-- key: history must survive a line being re-ingested or removed, which is
-- exactly when someone wants to read it.

CREATE TABLE IF NOT EXISTS public.canonical_script_versions (
  id            BIGSERIAL PRIMARY KEY,
  scenario_id   TEXT        NOT NULL,
  pod_slug      TEXT        NOT NULL,
  kind          TEXT        NOT NULL CHECK (kind IN ('original', 'save')),
  english_text  TEXT        NOT NULL,
  speaker       TEXT,
  author_notes  TEXT,
  saved_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  saved_by      TEXT        NOT NULL DEFAULT 'unknown'
);

-- One history read per line, in insertion order — the editor's only hot query.
CREATE INDEX IF NOT EXISTS canonical_script_versions_line_idx
  ON public.canonical_script_versions (scenario_id, id);

-- "Which lines in this script have been touched?" — the script page's chips.
CREATE INDEX IF NOT EXISTS canonical_script_versions_slug_idx
  ON public.canonical_script_versions (pod_slug, scenario_id);

-- The frozen original is frozen ONCE. Two concurrent first-edits of the same
-- line would otherwise each freeze their own "before", and the second one would
-- freeze the first one's edit as if it were the original words.
CREATE UNIQUE INDEX IF NOT EXISTS canonical_script_versions_one_original_idx
  ON public.canonical_script_versions (scenario_id)
  WHERE kind = 'original';

-- Append-only, enforced by the database rather than by everyone remembering.
-- A restore is an INSERT; there is no operation in this design that legitimately
-- updates or deletes a version row.
CREATE OR REPLACE FUNCTION public.canonical_script_versions_append_only()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'canonical_script_versions is append-only: % is not allowed (restore by appending a new save)', TG_OP;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS canonical_script_versions_append_only_trg ON public.canonical_script_versions;
CREATE TRIGGER canonical_script_versions_append_only_trg
  BEFORE UPDATE OR DELETE ON public.canonical_script_versions
  FOR EACH ROW EXECUTE FUNCTION public.canonical_script_versions_append_only();

COMMENT ON TABLE public.canonical_script_versions IS
  'Append-only edit history for canonical_pod_scenarios lines (Script Lab). One frozen original per line plus one row per save; restores append, never delete.';
