-- Canonical Pod scenarios — the language-neutral English master that the pod
-- generator flexes per lang-pair. Mirrors canonical_seeds: one editable English
-- source, many generated per-course versions (listening_pod_sentences).
--
-- Today the "master" is a hand-authored file (~/Desktop/english-pods.md). This
-- promotes it to a dashboard-editable store so Aran writes/edits the 10 Pod-0
-- scenarios in English in the dashboard, and "Generate pod" flexes them into
-- any course's listening_pod_sentences (target dialogue + known translation),
-- which stay editable per-course — exactly the seed → translation pattern.
--
-- Seeded from english-pods.md by tools/seed-canonical-pods.cjs.
-- SQL-editor safe (no CONCURRENTLY / VACUUM).

CREATE TABLE IF NOT EXISTS canonical_pod_scenarios (
  id              TEXT PRIMARY KEY,        -- '<pod_slug>:SC<NN>-S<NN>'  e.g. 'pod-0:SC01-S003'
  pod_slug        TEXT NOT NULL,           -- canonical pod set: 'pod-0' (core); future: 'music', etc.
  scene_number    INTEGER NOT NULL,        -- 1..N scene within the pod set
  scene_label     TEXT,                    -- 'Pod 0' | '0b' | '1' .. '8'  (display label)
  scene_title     TEXT,                    -- 'A Day of Greetings'
  scene_subtitle  TEXT,                    -- 'Morning to night'
  difficulty      TEXT,                    -- 'beginner' etc. (optional)
  sentence_number INTEGER NOT NULL,        -- 1..M within the scene
  global_order    INTEGER NOT NULL,        -- 1..T across the whole pod set (drives sentence order)
  speaker         TEXT,                    -- canonical English speaker role, e.g. 'Neighbour (8 am)', 'Barista'
  english_text    TEXT NOT NULL,           -- the canonical English line (the thing Aran edits)
  author_notes    TEXT,                    -- optional per-line authoring guidance for the generator
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (pod_slug, global_order),
  UNIQUE (pod_slug, scene_number, sentence_number)
);

CREATE INDEX IF NOT EXISTS idx_canonical_pod_scenarios_pod_slug
  ON canonical_pod_scenarios (pod_slug, global_order);

-- keep updated_at fresh on edits (mirrors other content tables)
CREATE OR REPLACE FUNCTION touch_canonical_pod_scenarios()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at := now(); RETURN NEW; END $$;

DROP TRIGGER IF EXISTS trg_touch_canonical_pod_scenarios ON canonical_pod_scenarios;
CREATE TRIGGER trg_touch_canonical_pod_scenarios
  BEFORE UPDATE ON canonical_pod_scenarios
  FOR EACH ROW EXECUTE FUNCTION touch_canonical_pod_scenarios();

NOTIFY pgrst, 'reload schema';
