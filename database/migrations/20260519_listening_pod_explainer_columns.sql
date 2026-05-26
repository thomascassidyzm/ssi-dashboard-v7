-- =============================================================================
-- Add explainer columns to listening_pod_sentences.
--
-- Per Tom's 2026-05-19 spec, Stage 1 of the listening pod player gets a
-- new pedagogical slot: a per-sentence "explainer" that decomposes the
-- target sentence into LEGO-sized chunks with English glosses, narrated
-- in mixed language by xAI multilingual TTS.
--
-- The Stage-1 sequence per sentence becomes:
--
--     target → known → explainer → target → target
--
-- and the explainer slot is *only* surfaced in Stage 1 (the first
-- introduction of the sentence). Subsequent stages skip the slot
-- entirely. This is a player-side decision; the data lives on every
-- sentence row regardless of which stages render it.
--
-- Example (Italian for English):
--   target_text:    "Buona sera, come stai?"
--   known_text:     "Good afternoon, how are you doing?"
--   explainer_decomposition:
--     [
--       { "chunk_target": "buona", "chunk_known": "good" },
--       { "chunk_target": "sera", "chunk_known": "afternoon" },
--       { "chunk_target": "come stai", "chunk_known": "how are you doing" }
--     ]
--   explainer_text: "buona means good, sera means afternoon, come stai
--                    means how are you doing"
--   explainer_audio_id: <uuid of the xAI multilingual TTS render>
--
-- The connector word ("means") localises per learner-language:
--   *_for_eng → "means"
--   *_for_spa → "significa"
--   *_for_fra → "veut dire"
--   *_for_jpn → "は ... という意味です"  (et al.)
-- The connector lives inside explainer_text per row.
--
-- All three columns are nullable. The content-generation endpoint
-- backfills them in batches and the player gracefully falls back to
-- the existing four-file Stage-1 sequence when explainer_audio_id is
-- NULL — so this migration is fully backwards-compatible and the new
-- slot lights up per-sentence as audio is generated.
--
-- Cost note: at xAI's ~$15/million chars, generating explainers for
-- ~117 sentences × ~50 courses is sub-dollar. No spend gate needed.
--
-- Rollback:
--   ALTER TABLE listening_pod_sentences DROP COLUMN IF EXISTS explainer_audio_id;
--   ALTER TABLE listening_pod_sentences DROP COLUMN IF EXISTS explainer_text;
--   ALTER TABLE listening_pod_sentences DROP COLUMN IF EXISTS explainer_decomposition;
-- =============================================================================

ALTER TABLE listening_pod_sentences
  ADD COLUMN IF NOT EXISTS explainer_decomposition jsonb;

ALTER TABLE listening_pod_sentences
  ADD COLUMN IF NOT EXISTS explainer_text text;

ALTER TABLE listening_pod_sentences
  ADD COLUMN IF NOT EXISTS explainer_audio_id uuid;

COMMENT ON COLUMN listening_pod_sentences.explainer_decomposition IS
  'Ordered array of LEGO-sized chunks pairing target language fragments '
  'to their known-language glosses: [{chunk_target, chunk_known}, ...]. '
  'Editable structured form; explainer_text is the narration string '
  'derived from this for TTS.';

COMMENT ON COLUMN listening_pod_sentences.explainer_text IS
  'Mixed-language narration string fed to xAI multilingual TTS. '
  'Pattern: "<chunk_target> means <chunk_known>, ..." with the '
  'connector localised per learner-language. NULL = no explainer '
  'authored yet; player falls back to 4-file Stage-1 sequence.';

COMMENT ON COLUMN listening_pod_sentences.explainer_audio_id IS
  'UUID of the rendered xAI multilingual TTS audio in course_audio. '
  'Plays in Stage 1 only, between known and the two target replays. '
  'NULL = audio not yet generated.';

-- Reload PostgREST schema cache so the new columns are visible to API clients.
NOTIFY pgrst, 'reload schema';
