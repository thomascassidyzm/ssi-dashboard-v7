-- Migration: listening_pods + listening_pod_sentences
-- Date: 2026-04-21
-- Purpose: DB-backed storage for Layer 2 listening content (Pod 0 core + choice pods)
--          per Aran's listening-layers methodology. Replaces the hardcoded
--          listeningPods.ts test data once the pod-sync pipeline is in place.
--
-- Design decisions (locked 2026-04-21):
--   - Two-table schema (pods + sentences) matching the course_seeds/course_legos
--     pattern; no JSONB for sentence arrays.
--   - Audio stored in course_audio (shared text-hash reuse, same S3 bucket).
--   - Speaker → voice mapping is per-pod in listening_pods.speakers JSONB.
--   - pod_type: 'core' (Pod 0, everyone does it) | 'choice' (unlocks after Pod 0).

-- ---------------------------------------------------------------------------
-- listening_pods: pod metadata + speaker-to-voice mapping
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS listening_pods (
  id                TEXT PRIMARY KEY,           -- 'spa_for_eng:POD0' or 'spa_for_eng:POD-TRAVEL'
  course_code       TEXT NOT NULL,
  pod_type          TEXT NOT NULL CHECK (pod_type IN ('core', 'choice')),
  slug              TEXT NOT NULL,              -- 'pod-0' | 'travel' | 'sport'
  pod_order         INTEGER,                    -- display order among choice pods (NULL for core)
  title             TEXT,
  scene             TEXT,                       -- optional higher-level grouping label
  difficulty        TEXT CHECK (difficulty IN ('beginner', 'beginner-intermediate', 'intermediate', 'advanced')),

  -- Per-pod speaker → voice mapping. Shape:
  --   {
  --     "Pablo":    { "voice_id": "leo", "provider": "xai", "gender": "m" },
  --     "Ana":      { "voice_id": "eve", "provider": "xai", "gender": "f" },
  --     "_default": { "voice_id": "sal", "provider": "xai" }
  --   }
  -- The "_default" key is used for speakers not explicitly mapped (e.g. bit-parts).
  speakers          JSONB NOT NULL DEFAULT '{}'::jsonb,

  -- Provenance: which markdown file this pod was synced from (for re-sync)
  source_file       TEXT,

  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE (course_code, slug)
);

CREATE INDEX IF NOT EXISTS idx_listening_pods_course      ON listening_pods(course_code);
CREATE INDEX IF NOT EXISTS idx_listening_pods_course_type ON listening_pods(course_code, pod_type);

COMMENT ON TABLE listening_pods IS
  'Layer 2 listening pods (Pod 0 core + choice pods) per Aran listening-layers methodology';
COMMENT ON COLUMN listening_pods.speakers IS
  'Speaker name → { voice_id, provider, gender } mapping. "_default" key for unmapped speakers.';
COMMENT ON COLUMN listening_pods.pod_type IS
  'core = everyone does it (Pod 0); choice = learner picks one after Pod 0';
COMMENT ON COLUMN listening_pods.source_file IS
  'Markdown file this pod was last synced from (provenance, for re-sync)';

-- ---------------------------------------------------------------------------
-- listening_pod_sentences: one row per sentence, audio IDs link to course_audio
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS listening_pod_sentences (
  id                TEXT PRIMARY KEY,           -- 'spa_for_eng:POD0:SC01-S003' etc.
  pod_id            TEXT NOT NULL REFERENCES listening_pods(id) ON DELETE CASCADE,

  scene_number      INTEGER NOT NULL,           -- scene within the pod (1-indexed)
  sentence_number   INTEGER NOT NULL,           -- sentence within the scene (1-indexed)
  global_order      INTEGER NOT NULL,           -- 1..N across the whole pod; drives stage injection sequencing

  speaker           TEXT NOT NULL,              -- resolves to a voice via the parent pod's speakers JSONB
  target_text       TEXT NOT NULL,
  known_text        TEXT NOT NULL,

  -- Audio references. NULL until Phase 8 generates/links.
  -- course_audio.id is UUID; these nullable FKs allow a sentence to exist
  -- before its audio is generated, then be linked once available.
  target_audio_id   UUID REFERENCES course_audio(id) ON DELETE SET NULL,
  known_audio_id    UUID REFERENCES course_audio(id) ON DELETE SET NULL,

  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE (pod_id, global_order),
  UNIQUE (pod_id, scene_number, sentence_number)
);

CREATE INDEX IF NOT EXISTS idx_listening_pod_sentences_pod          ON listening_pod_sentences(pod_id);
CREATE INDEX IF NOT EXISTS idx_listening_pod_sentences_pod_order    ON listening_pod_sentences(pod_id, global_order);
CREATE INDEX IF NOT EXISTS idx_listening_pod_sentences_target_audio ON listening_pod_sentences(target_audio_id);
CREATE INDEX IF NOT EXISTS idx_listening_pod_sentences_known_audio  ON listening_pod_sentences(known_audio_id);
CREATE INDEX IF NOT EXISTS idx_listening_pod_sentences_needs_audio
  ON listening_pod_sentences(pod_id)
  WHERE target_audio_id IS NULL OR known_audio_id IS NULL;

COMMENT ON TABLE listening_pod_sentences IS
  'Individual sentences within a pod; audio IDs link to course_audio';
COMMENT ON COLUMN listening_pod_sentences.global_order IS
  '1-indexed ordering across the pod (drives stage injection sequencing at round-end)';
COMMENT ON COLUMN listening_pod_sentences.speaker IS
  'Speaker name; resolves to a voice via the parent pod.speakers JSONB at generation time';

-- ---------------------------------------------------------------------------
-- updated_at triggers
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION touch_listening_pods_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS listening_pods_touch_updated_at ON listening_pods;
CREATE TRIGGER listening_pods_touch_updated_at
  BEFORE UPDATE ON listening_pods
  FOR EACH ROW EXECUTE FUNCTION touch_listening_pods_updated_at();

DROP TRIGGER IF EXISTS listening_pod_sentences_touch_updated_at ON listening_pod_sentences;
CREATE TRIGGER listening_pod_sentences_touch_updated_at
  BEFORE UPDATE ON listening_pod_sentences
  FOR EACH ROW EXECUTE FUNCTION touch_listening_pods_updated_at();
