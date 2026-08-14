-- One recordist surface: the per-language human-voice-only decision.
--
-- Tom, 2026-08-14: "what are we doing? we're improving the WHOLE human recording
-- set of processes for any languages WE DECIDE we don't have the TTS voices for"
-- and "we only need the PODS recorded by language, not by course from now on".
--
-- So the decision is PER LANGUAGE, made by a human, and it lives in exactly ONE
-- place — this table. Not per course, not per pod, not per clip, and never
-- inferred by the system. `language` is the estate's canonical database_code,
-- the same value services/shared/clip-identity.cjs canonicalLanguage() returns,
-- which is what makes a queue "by language, not by course" expressible at all.
--
-- What the flag gates: with human_only = true, that language's missing audio is
-- NOT TTS-rendered — it waits for a human. It deliberately does NOT retro-delete
-- or supersede existing TTS clips in the language; that is a separate,
-- destructive decision and it belongs to Tom.

CREATE TABLE IF NOT EXISTS language_recording_policy (
  -- Canonical database_code ('cym', 'zzz'). Region-free, three letters, and the
  -- same spelling course codes are built from.
  language      text PRIMARY KEY,

  -- THE flag. True = we have no TTS voice we accept for this language.
  human_only    boolean NOT NULL DEFAULT false,

  -- The two queues per language. Shape mirrors the podCast the estate already
  -- casts with, so Aran and Catrin map onto it without a new casting model:
  --   { "m": {"voiceId","name","email"}, "f": {"voiceId","name","email"} }
  -- voiceId is a canonical 'human_*' voice id and IS the recordist's identity:
  -- whoever holds the link is that voice.
  voices        jsonb   NOT NULL DEFAULT '{}'::jsonb,

  -- Why the decision was made, in a human's words. Free text, never parsed.
  notes         text,

  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE language_recording_policy IS
  'The ONE place the per-language human-voice-only decision lives (Tom 2026-08-14). Read by the recordist surface and by the audio pipeline; never inferred.';

CREATE OR REPLACE FUNCTION touch_language_recording_policy()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS language_recording_policy_touch ON language_recording_policy;
CREATE TRIGGER language_recording_policy_touch
  BEFORE UPDATE ON language_recording_policy
  FOR EACH ROW EXECUTE FUNCTION touch_language_recording_policy();

-- Readable by the learner-side anon role too: the audio pipeline must be able to
-- ask "is this language human-only?" from wherever it runs. Writes stay with the
-- service key, i.e. the admin surface.
ALTER TABLE language_recording_policy ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS language_recording_policy_public_read ON language_recording_policy;
CREATE POLICY language_recording_policy_public_read
  ON language_recording_policy FOR SELECT TO anon, authenticated USING (true);

-- ── The two languages we have decided on so far ──────────────────────────────

-- Welsh (North). Aran and Catrin are already cast and Aran has already recorded;
-- their voice ids are taken verbatim from cym_n_for_eng's stored podCast so the
-- links Aran already holds keep resolving to the same identity.
INSERT INTO language_recording_policy (language, human_only, voices, notes) VALUES (
  'cym', true,
  '{"m": {"voiceId": "human_aran_cym_n", "name": "Aran", "email": "aran@hey.com"},
    "f": {"voiceId": "human_catrinlliar_cym_n", "name": "Catrin", "email": "catrinlliar@gmail.com"}}'::jsonb,
  'No TTS Welsh voice we accept. Aran (m) and Catrin (f) record it.'
)
ON CONFLICT (language) DO UPDATE
  SET human_only = EXCLUDED.human_only,
      voices     = EXCLUDED.voices,
      notes      = EXCLUDED.notes;

-- The test language. Deliberately a REAL language row running the identical real
-- pipeline — a mock would not tell Tom whether the real one works. The 'zzz'
-- prefix keeps it at the bottom of every alphabetical list, which is the point.
INSERT INTO language_recording_policy (language, human_only, voices, notes) VALUES (
  'zzz', true,
  '{"m": {"voiceId": "human_tom_zzz", "name": "Tom", "email": "tom@saysomethingin.com"},
    "f": {"voiceId": "human_test_f_zzz", "name": "Test Voice F", "email": "test-f@ssi-test.invalid"}}'::jsonb,
  'Test language. Never learner-facing. Exists so the recording surface can be driven end to end on the real pipeline.'
)
ON CONFLICT (language) DO UPDATE
  SET human_only = EXCLUDED.human_only,
      voices     = EXCLUDED.voices,
      notes      = EXCLUDED.notes;
