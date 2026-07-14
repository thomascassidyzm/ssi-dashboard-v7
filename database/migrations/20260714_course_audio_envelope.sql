-- Model-voice envelope metadata for the adaptation-v2 stage-2 signal
-- (ssi-learning-app/docs/adaptation/adaptation-v2-build-spec.md §5.2, WP-7).
--
-- Precomputed once per mastered model-voice clip (course_audio role='target1')
-- by tools/audio-envelope-batch.cjs, on the SAME 20ms-grid / smoothing / peak
-- algorithm the player's client-side extractor uses on the learner's own
-- envelope (packages/core/src/audio/envelopeMetadata.ts in ssi-learning-app,
-- constants shared via services/shared/envelope-extractor-v1.json). The
-- player diffs its own learner-side numbers against this row to drive the
-- adaptation engine's stage-2 evidence — read-only content data, same
-- posture as course_audio.
--
-- extractor_version gates comparability: a learner-side reading and a
-- model-side row must share extractor_version or the delta producer skips
-- (constants may be retuned later without invalidating old rows blindly).

CREATE TABLE IF NOT EXISTS course_audio_envelope (
  audio_id            uuid PRIMARY KEY REFERENCES course_audio(id) ON DELETE CASCADE,
  duration_ms         integer NOT NULL,
  peak_count           integer NOT NULL,
  peak_to_mean_ratio   real NOT NULL,
  mean_peak_width_ms   real NOT NULL,
  extractor_version    integer NOT NULL DEFAULT 1,
  created_at           timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE course_audio_envelope IS 'Precomputed volume-envelope metadata (duration, peak count, peak shape) for model-voice (course_audio role=target1) clips — adaptation-v2 stage-2 signal.';
COMMENT ON COLUMN course_audio_envelope.peak_count IS 'Syllable-scale energy peaks, 20ms-grid RMS envelope, prominence >= 25% of (max-mean), min separation 120ms.';
COMMENT ON COLUMN course_audio_envelope.peak_to_mean_ratio IS 'max linear RMS / mean linear RMS over the whole clip.';
COMMENT ON COLUMN course_audio_envelope.mean_peak_width_ms IS 'Mean full-width-at-half-prominence across detected peaks.';
COMMENT ON COLUMN course_audio_envelope.extractor_version IS 'Gates comparability against learner-side EnvelopeMetadata of the same version.';

ALTER TABLE course_audio_envelope ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anon_read_course_audio_envelope" ON course_audio_envelope
  FOR SELECT TO anon USING (true);

CREATE POLICY "authenticated_read_course_audio_envelope" ON course_audio_envelope
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "course_audio_envelope_service_policy" ON course_audio_envelope
  TO service_role USING (true) WITH CHECK (true);
