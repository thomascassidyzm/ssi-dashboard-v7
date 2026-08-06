-- Versioned, content-addressed algorithm config — give the settings a history.
--
-- docs/architecture/AUDIO_PIPELINE_PROVIDERS_FIDELITY_LABS-2026-08-06.md §3:
-- "algorithm_config is one row per key, upserted in place. No version column,
-- no history table, no snapshot, no draft/published split, no environment
-- split. updated_at and updated_by are the entire audit trail: you know who
-- last and when last, and nothing about what it was before. The previous value
-- is gone. Rollback is 'remember the number and re-type it'."
--
-- And it is worse than a missing feature because of what sits downstream:
-- useAlgorithmConfig.ts:487 in the learning app caches for FIVE MINUTES, so a
-- Save on the Listening or Speaking page is a production deploy to every
-- learner on every course within five minutes, with no undo. PodLab has
-- already concluded its own persistence layer is too dangerous to use and
-- exports tuned JSON to the clipboard instead of writing config back.
--
-- This is the same defect as the audio store's — a NAME whose meaning changes
-- underneath you — and it takes the same fix: hash the object, store it
-- immutably, and have the live pointer name a hash. Then "which config was
-- this course built under" is answerable, rolling back is repointing, and a
-- draft can exist without being live.
--
-- ADDITIVE ONLY, deliberately. algorithm_config is untouched: same columns,
-- same RLS, same rows, same meaning. Everything that reads it today —
-- ListeningConfig, SpeakingConfig, VadLab, PodLab, the learning app — keeps
-- working with no change at all. The new tables sit BESIDE it:
--
--   algorithm_config_versions  every config object that has ever been saved,
--                              immutable, addressed by its own content
--   algorithm_config_pointers  which hash is live ('published') and which is
--                              being worked on ('draft'), per key
--
-- algorithm_config remains the live published value — the pointer is a second
-- spelling of it, not a replacement — because making the learner path read a
-- new table is a change to the money path and this migration is not that.
--
-- THE HASH. config_hash is sha256 hex of the canonical JSON of
-- {config, key}: object keys sorted lexicographically at every depth, arrays
-- left in order. api/lib/config-hash.js is the definition; the SQL helper
-- below reproduces it ONLY to back-fill, and is dropped at the end of this
-- migration so no second permanent source of truth survives it. The two
-- implementations were checked to agree on all nine live rows before this
-- migration was applied (all nine MATCH).
--
-- The key is inside the hashed document on purpose: a pointer names a config
-- FOR a key, so a rollback can never serve `pods` a `listening` config.
--
-- BACK-FILL. Every existing algorithm_config row becomes a version, and
-- published points at it — history starts from the real live state rather than
-- from empty, so the very first Save after this migration already has
-- something to roll back TO.

BEGIN;

-- ---------------------------------------------------------------------------
-- The immutable store: one row per distinct config object ever saved.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS algorithm_config_versions (
  config_hash text PRIMARY KEY,
  key         text NOT NULL,
  config      jsonb NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now(),
  created_by  text,
  note        text
);

COMMENT ON TABLE algorithm_config_versions IS
  'Immutable, content-addressed history of algorithm_config values. One row per (key, config object); config_hash = sha256 of canonical JSON of {config, key} — see api/lib/config-hash.js. Never updated, never deleted: saving the same object twice is a no-op (ON CONFLICT DO NOTHING), which is why the same config re-saved does not grow the table.';
COMMENT ON COLUMN algorithm_config_versions.note IS
  'Optional human note for why this value exists ("VOICELAB experiment 0", "rolled forward from draft").';

-- The history view a lab asks for: newest first, for one key.
CREATE INDEX IF NOT EXISTS idx_algorithm_config_versions_key_created
  ON algorithm_config_versions (key, created_at DESC);

-- ---------------------------------------------------------------------------
-- The mutable pointers: which version is live, which is being worked on.
--
-- Two channels only. 'published' is what learners get; 'draft' is a config
-- that exists without being live — the thing PodLab's clipboard is standing in
-- for today. Environment splits, per-course pointers and named experiments are
-- deliberately NOT modelled here: a channel is a text column, so adding one
-- later is a CHECK change and no data migration, and inventing them now would
-- be building for a use nobody has yet.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS algorithm_config_pointers (
  key         text NOT NULL,
  channel     text NOT NULL CHECK (channel IN ('published', 'draft')),
  config_hash text NOT NULL REFERENCES algorithm_config_versions(config_hash),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  updated_by  text,
  PRIMARY KEY (key, channel)
);

COMMENT ON TABLE algorithm_config_pointers IS
  'Which immutable version each key is currently serving (channel=published) or drafting (channel=draft). Rollback repoints this row; it never writes a new version. The FK to algorithm_config_versions is what makes a pointer unable to name a config that does not exist.';

-- ---------------------------------------------------------------------------
-- RLS — the same shape algorithm_config already has: everyone reads, only
-- service_role writes. Admin writes go through /api/algorithm-config and
-- /api/algorithm-config-versions, which check a Supabase JWT first.
-- ---------------------------------------------------------------------------
ALTER TABLE algorithm_config_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE algorithm_config_pointers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can read algorithm_config_versions" ON algorithm_config_versions;
CREATE POLICY "Anyone can read algorithm_config_versions"
  ON algorithm_config_versions FOR SELECT USING (true);

DROP POLICY IF EXISTS "Service role can write algorithm_config_versions" ON algorithm_config_versions;
CREATE POLICY "Service role can write algorithm_config_versions"
  ON algorithm_config_versions FOR ALL TO service_role
  USING ((SELECT auth.role()) = 'service_role');

DROP POLICY IF EXISTS "Anyone can read algorithm_config_pointers" ON algorithm_config_pointers;
CREATE POLICY "Anyone can read algorithm_config_pointers"
  ON algorithm_config_pointers FOR SELECT USING (true);

DROP POLICY IF EXISTS "Service role can write algorithm_config_pointers" ON algorithm_config_pointers;
CREATE POLICY "Service role can write algorithm_config_pointers"
  ON algorithm_config_pointers FOR ALL TO service_role
  USING ((SELECT auth.role()) = 'service_role');

-- ---------------------------------------------------------------------------
-- Back-fill: history starts from the real live state.
--
-- The canonicaliser below must produce byte-for-byte what api/lib/config-hash.js
-- produces, or the first Save after this migration would insert a SECOND
-- version row for a config that has not changed. Two details earn their keep:
--
--   * `collate "C"` — JS sorts keys by code unit, not by the database's
--     locale. Without this, a config with accented or upper/lower-case sibling
--     keys would order differently in SQL than in Node.
--   * `trim_scale(...)` — jsonb keeps a number's scale, so 1.0 renders as
--     "1.0" here and as "1" in JS. Trimming the scale makes them agree.
--
-- Verified on the live database before applying: all nine existing rows hash
-- identically under both implementations.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION pg_temp._cfg_canonical_json(v jsonb) RETURNS text
LANGUAGE sql IMMUTABLE AS $$
  SELECT CASE jsonb_typeof(v)
    WHEN 'object' THEN COALESCE((
      SELECT '{' || string_agg(to_jsonb(e.k)::text || ':' || pg_temp._cfg_canonical_json(e.val), ',' ORDER BY e.k COLLATE "C") || '}'
      FROM jsonb_each(v) AS e(k, val)
    ), '{}')
    WHEN 'array' THEN COALESCE((
      SELECT '[' || string_agg(pg_temp._cfg_canonical_json(e.val), ',' ORDER BY e.ord) || ']'
      FROM jsonb_array_elements(v) WITH ORDINALITY AS e(val, ord)
    ), '[]')
    WHEN 'number' THEN trim_scale((v #>> '{}')::numeric)::text
    ELSE v::text
  END
$$;

INSERT INTO algorithm_config_versions (config_hash, key, config, created_at, created_by, note)
SELECT
  encode(sha256(convert_to(
    pg_temp._cfg_canonical_json(jsonb_build_object('config', c.config, 'key', c.key)), 'UTF8')), 'hex'),
  c.key,
  c.config,
  COALESCE(c.updated_at, now()),
  c.updated_by,
  'back-filled from algorithm_config at versioning migration'
FROM algorithm_config c
ON CONFLICT (config_hash) DO NOTHING;

INSERT INTO algorithm_config_pointers (key, channel, config_hash, updated_at, updated_by)
SELECT
  c.key,
  'published',
  encode(sha256(convert_to(
    pg_temp._cfg_canonical_json(jsonb_build_object('config', c.config, 'key', c.key)), 'UTF8')), 'hex'),
  COALESCE(c.updated_at, now()),
  c.updated_by
FROM algorithm_config c
ON CONFLICT (key, channel) DO NOTHING;

-- The helper exists only for the back-fill above. pg_temp is session-local, so
-- it goes when the session does; dropped explicitly so a long-lived session
-- cannot leave a second, drifting definition of the hash lying around.
DROP FUNCTION IF EXISTS pg_temp._cfg_canonical_json(jsonb);

COMMIT;
