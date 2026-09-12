/**
 * ElevenLabs — CONTROL (the known-variable benchmark). Key present on this box.
 *
 * Mirrors what the repo already sends. Matched against services/tts-service.cjs
 * generateElevenLabs() (lines 236-286, read 2026-08-26):
 *   - POST https://api.elevenlabs.io/v1/text-to-speech/{voiceId}   — :252
 *   - headers Accept: audio/mpeg, xi-api-key                        — :258-262
 *   - body { text, model_id: 'eleven_multilingual_v2',
 *            voice_settings: { stability, similarity_boost, style: 0,
 *                              use_speaker_boost: true } }          — :263-272
 *   - repo defaults stability 0.5-ish / similarity_boost 0.75       — :240-241
 * Field list and the seed caveat verified against
 * https://elevenlabs.io/docs/api-reference/text-to-speech/convert (fetched 2026-08-26).
 *
 * The bake-off adds ONE field the repo does not send: `seed`. That is the whole
 * point of having ElevenLabs in the run — it is the only control with a seed,
 * and the vendor's own words are "Determinism is not guaranteed". Axis E can
 * therefore be measured against a provider that offers the knob and admits it
 * may not hold, which is exactly the failure mode we are hunting in the
 * candidates.
 */
const { envRef, httpSynthesise } = require('../lib/adapter-utils.cjs');

const DEFAULT_MODEL = 'eleven_multilingual_v2';

module.exports = {
  id: 'elevenlabs',
  displayName: 'ElevenLabs (control: known-variable benchmark)',
  role: 'control',
  requiredEnv: ['ELEVENLABS_API_KEY'],
  stubbed: false,
  supportsSeed: true,
  supportsTemperature: false,
  supportsVersionPinning: 'partial',
  versionPinningNote:
    'model_id pins a named model generation (eleven_multilingual_v2, eleven_turbo_v2_5, eleven_v3 …) but there is no ' +
    'dated snapshot id, so an in-place update to a named model cannot be ruled out. seed is documented at 0-4294967295 ' +
    'with the explicit caveat "Determinism is not guaranteed" — record that verbatim in every metadata sidecar so nobody ' +
    'later reads a seed field and assumes repeatability.',
  docs: ['https://elevenlabs.io/docs/api-reference/text-to-speech/convert'],
  languageSupport(iso3) {
    return { supported: null, note: 'eleven_multilingual_v2 publishes a 29-language list; verify Welsh by ear rather than by list. Unknown from docs alone.' };
  },

  buildRequest(utterance, opts = {}) {
    const body = {
      text: utterance.text,
      model_id: opts.model || DEFAULT_MODEL,
      voice_settings: {
        stability: opts.stability != null ? opts.stability : 0.5,
        similarity_boost: opts.similarityBoost != null ? opts.similarityBoost : 0.75,
        style: opts.style != null ? opts.style : 0,
        use_speaker_boost: true,
        ...(opts.speed != null ? { speed: opts.speed } : {}),
      },
    };
    if (opts.seed != null) body.seed = opts.seed;
    if (opts.languageCode) body.language_code = opts.languageCode;

    const outputFormat = opts.outputFormat || 'mp3_44100_128';
    return {
      transport: 'http',
      endpoint: `https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(opts.voice)}?output_format=${outputFormat}`,
      method: 'POST',
      headers: {
        Accept: 'audio/mpeg',
        'Content-Type': 'application/json',
        'xi-api-key': envRef('ELEVENLABS_API_KEY'),
      },
      body,
      responseKind: 'audio-bytes',
      unsupportedOptions: [
        ...(opts.temperature != null ? ['temperature — no temperature field on /v1/text-to-speech; stability/style are the nearest knobs'] : []),
      ],
      notes: ['vendor caveat on seed: "Determinism is not guaranteed"'],
    };
  },

  async synthesise(utterance, opts = {}) {
    return httpSynthesise(this, this.buildRequest(utterance, opts), opts);
  },
};
