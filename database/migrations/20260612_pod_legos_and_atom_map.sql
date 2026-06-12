-- Pod-LEGO inventory + per-sentence atom map (Atom-Fusion Introduction, v2).
--
-- The listening pods are a SEPARATE corpus from the speaking course, so they
-- have no shared LEGO inventory to snap explainer atoms to. This migration adds
-- the two stores the corpus-first extraction produces:
--
--   pod_legos                       — the canonical inventory (identity layer):
--                                     one row per recurring known<->target unit,
--                                     defined once for the whole course's pods.
--   listening_pod_sentences.atom_map — the per-clause position layer: an ordered
--                                     list of atom entries that CITE inventory
--                                     units by lego_key and carry this clause's
--                                     target offsets + kind + (note) spans.
--
-- See docs/architecture/atom-fusion-introduction.md. This is the identity-vs-
-- position split that mirrors course_legos (canonical) vs practice phrases
-- (instances). SQL-editor safe (no CONCURRENTLY / VACUUM).

CREATE TABLE IF NOT EXISTS pod_legos (
  id                    TEXT PRIMARY KEY,          -- '<course_code>:<lego_key>'  e.g. 'hrv_for_eng:na-posao'
  course_code           TEXT NOT NULL,
  lego_key              TEXT NOT NULL,             -- normalised slug of the canonical target surface
  target                TEXT NOT NULL,             -- canonical target surface form (e.g. 'na posao')
  known                 TEXT NOT NULL,             -- canonical known-language gloss (ZUT-resolved)

  -- First-encounter discipline: the lowest global_order pod sentence in which
  -- this unit appears is where it is TAUGHT (kind='atom'); every later
  -- appearance is kind='passthrough'. Without a corpus inventory "first
  -- encounter" cannot be defined — this is what makes it real.
  first_seen_order      INTEGER NOT NULL,
  first_seen_sentence   TEXT,                      -- listening_pod_sentences.id of the debut

  occurrence_count      INTEGER NOT NULL DEFAULT 1,

  -- Proper nouns (names/places). These are spoken in the clause (so they fuse)
  -- but are never taught — always kind='passthrough'. Kept in the inventory so
  -- tiling stays total (every token belongs to exactly one unit).
  is_name               BOOLEAN NOT NULL DEFAULT false,

  -- ZUT resolution: when the same target surfaced with more than one known
  -- gloss across the corpus, the most frequent wins (above) and the alternates
  -- are parked here for QA. A non-empty array means "human, please confirm the
  -- canonical gloss" — the cache key and the learner both need ONE mapping.
  zut_alternates        JSONB NOT NULL DEFAULT '[]'::jsonb,

  -- The canonical per-atom explainer audio ("<target> means <known>") is owned
  -- HERE, keyed by text, rendered once and reused across every clause the unit
  -- appears in (the dedup split). NULL until the audio pass runs (cost-gated).
  explainer_audio_id    UUID,

  -- Set when the extractor could not cleanly allocate this unit (isolated
  -- residue, suspected bad gloss) — surfaces it in the admin QA Mode.
  needs_review          BOOLEAN NOT NULL DEFAULT false,
  review_note           TEXT,

  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE (course_code, lego_key)
);

CREATE INDEX IF NOT EXISTS pod_legos_course_idx        ON pod_legos (course_code);
CREATE INDEX IF NOT EXISTS pod_legos_course_order_idx  ON pod_legos (course_code, first_seen_order);
CREATE INDEX IF NOT EXISTS pod_legos_needs_review_idx  ON pod_legos (course_code) WHERE needs_review;

COMMENT ON TABLE pod_legos IS
  'Canonical pod-LEGO inventory (identity layer) for the Atom-Fusion explainer. '
  'One row per recurring known<->target unit per course; owns the canonical '
  'per-atom explainer audio. See docs/architecture/atom-fusion-introduction.md.';

-- Per-clause atom map (position layer). Ordered array of atom entries, each
-- citing a pod_legos unit by lego_key:
--
--   [
--     { "lego_key": "ides", "kind": "atom", "gloss": "you're going",
--       "target_surface": "Ideš",
--       "target_start_ms": null, "target_end_ms": null },     -- offsets: audio pass
--     { "lego_key": "na-posao", "kind": "passthrough", ... },
--     { "kind": "note", "gloss": "the colour comes after the noun",
--       "spans": [2,3], "explainer_start_ms": null, "explainer_end_ms": null }
--   ]
--
-- atom entries carry TARGET offsets only (explainer is the inventory's whole
-- canonical clip, cited not sliced). note entries carry explainer offsets (into
-- the per-clause note_audio) + a spans range, and no target audio of their own.
ALTER TABLE listening_pod_sentences
  ADD COLUMN IF NOT EXISTS atom_map JSONB;

-- The per-clause note audio (the ONLY clause-specific explainer asset that
-- survives the dedup split — atoms cite inventory clips instead). NULL when the
-- clause carries no notes, which is the common case. Cost-gated like all audio.
ALTER TABLE listening_pod_sentences
  ADD COLUMN IF NOT EXISTS note_audio_id UUID;

COMMENT ON COLUMN listening_pod_sentences.atom_map IS
  'Atom-Fusion position layer: ordered atom/passthrough/note entries citing '
  'pod_legos by lego_key, with this clause''s target offsets. See '
  'docs/architecture/atom-fusion-introduction.md.';
