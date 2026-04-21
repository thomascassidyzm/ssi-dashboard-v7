-- Migration: Extend listening_pods + listening_pod_sentences for richer pod structures
-- Date: 2026-04-21
-- Purpose: Support discursive choice pods (music, sport, politics, etc.) with
--          3-level nesting (segment -> beat -> sentence), host profiles, and
--          design notes — while keeping Pod 0 (2-level scene -> sentence,
--          minimal frontmatter) unchanged.
--
-- Both additions are optional JSONB/TEXT — old data reads as NULL / empty
-- object, no parser or UI change required for pods that don't need them.

-- ---------------------------------------------------------------------------
-- listening_pods.metadata: pod-level freeform metadata
-- ---------------------------------------------------------------------------
-- Shape (all optional, use what applies):
--   {
--     "hosts": [
--       { "name": "Elena", "description": "30s, journalist, reflective", "voice_id": "eve" },
--       { "name": "Dani",  "description": "20s, enthusiast, pop-culture-fluent", "voice_id": "leo" }
--     ],
--     "register": "discursive · opinion-led · subjunctive of opinion",
--     "design_notes": "First discursive choice pod — format pivots from situational...",
--     "sections": [
--       { "number": 1, "title": "La música que nos marcó", "subtitle": "the music that shaped us",
--         "status": "drafted", "target_sentence_count": 44 },
--       { "number": 2, "title": "La banda sonora de una época", "status": "outlined" },
--       ...
--     ],
--     "target_total_sentences": 800,
--     "target_duration_minutes": 60
--   }
--
-- For Pod 0 (scene-based), this stays {} and section info is implicit in
-- listening_pod_sentences.scene_number + parsed scene title.

ALTER TABLE listening_pods
  ADD COLUMN IF NOT EXISTS metadata JSONB NOT NULL DEFAULT '{}'::jsonb;

COMMENT ON COLUMN listening_pods.metadata IS
  'Freeform pod metadata: hosts, register, design notes, section outlines, targets. Shape varies by pod type.';

-- ---------------------------------------------------------------------------
-- listening_pod_sentences.beat_label: optional sub-section label
-- ---------------------------------------------------------------------------
-- For discursive pods (music, sport, politics) where segments are divided
-- into named beats for authoring clarity. Example: "Beat 1 — Opening".
-- NULL for pods without beats (Pod 0, situational pods).

ALTER TABLE listening_pod_sentences
  ADD COLUMN IF NOT EXISTS beat_label TEXT;

COMMENT ON COLUMN listening_pod_sentences.beat_label IS
  'Optional sub-section label (e.g. "Beat 1 — Opening") for pods that group sentences into beats within a scene/segment. NULL for pods without beats.';
