/**
 * OpenAI TTS / custom voices — CANDIDATE. STUBBED: no OPENAI_API_KEY on this box.
 *
 * Request shape taken from the CreateSpeechRequest schema in the vendor's own
 * OpenAPI document, fetched 2026-08-26:
 *   https://raw.githubusercontent.com/openai/openai-openapi/master/openapi.yaml  (schema at line 36537)
 *   https://developers.openai.com/api/docs/guides/text-to-speech
 *
 * Welsh: the TTS guide states language support "generally follows the Whisper
 * model" and lists Welsh explicitly. That makes OpenAI the ONLY candidate of
 * the three HTTP ones whose docs claim Welsh at all — but a claimed language is
 * not a convincing language, and Gate Zero is decided by ear, not by a list.
 */
const { envRef, noCredentialError, assertSpendAllowed } = require('../lib/adapter-utils.cjs');

const DEFAULT_MODEL = 'gpt-4o-mini-tts';
const PINNED_EXAMPLE = 'gpt-4o-mini-tts-2025-12-15';
const BUILTIN_VOICES = ['alloy', 'ash', 'ballad', 'coral', 'echo', 'fable', 'onyx', 'nova', 'sage', 'shimmer', 'verse', 'marin', 'cedar'];

module.exports = {
  id: 'openai',
  displayName: 'OpenAI TTS (gpt-4o-mini-tts)',
  role: 'candidate',
  requiredEnv: ['OPENAI_API_KEY'],
  stubbed: true,
  stubReason:
    'No OPENAI_API_KEY in the repo-root .env on watson-1 (verified 2026-08-26). Note the repo also forbids the ' +
    'Anthropic SDK path for LLM calls — unrelated, but the same "no key on this box" situation. Phase-2 blocker. ' +
    'Custom voices are additionally gated: the guide says they are "limited to eligible customers" and need consent ' +
    'plus sample recordings, so a custom-voice bake-off entry is an ACCOUNT question before it is a technical one.',
  supportsSeed: false,
  supportsTemperature: false,
  supportsVersionPinning: true,
  versionPinningNote:
    'Dated model ids: the schema enum carries both the floating "gpt-4o-mini-tts" and the snapshot ' +
    `"${PINNED_EXAMPLE}". Pin the dated one. tts-1 / tts-1-hd are the older models and take no instructions.`,
  docs: [
    'https://raw.githubusercontent.com/openai/openai-openapi/master/openapi.yaml',
    'https://developers.openai.com/api/docs/guides/text-to-speech',
  ],
  languageSupport(iso3) {
    // The guide gives a prose list ("...and Welsh"), not a machine-readable enum,
    // so anything outside the handful we can quote is honestly unknown.
    if (iso3 === 'cym') {
      return { supported: true, note: 'Welsh is named explicitly in the TTS guide language list (fetched 2026-08-26). Claimed, not verified by ear.' };
    }
    return { supported: null, note: 'OpenAI publishes a prose Whisper-derived language list, not an enum. Unknown for this code without a live listen.' };
  },

  buildRequest(utterance, opts = {}) {
    const voice = opts.customVoiceId ? { id: opts.customVoiceId } : opts.voice;
    const body = {
      model: opts.model || DEFAULT_MODEL,
      input: utterance.text,
      voice,
      response_format: opts.codec || 'mp3',
    };
    if (opts.speed != null) body.speed = opts.speed;
    // `instructions` is this provider's only expressivity control and it is
    // PROSE — the opposite of a numeric knob. Scored under axis F (control).
    if (opts.instructions) body.instructions = opts.instructions;

    return {
      transport: 'http',
      endpoint: 'https://api.openai.com/v1/audio/speech',
      method: 'POST',
      headers: {
        Authorization: `Bearer ${envRef('OPENAI_API_KEY')}`,
        'Content-Type': 'application/json',
      },
      body,
      responseKind: 'audio-bytes',
      unsupportedOptions: [
        ...(opts.seed != null ? ['seed — CreateSpeechRequest has no seed property (checked against the OpenAPI schema, not prose)'] : []),
        ...(opts.temperature != null ? ['temperature — CreateSpeechRequest has no temperature property'] : []),
      ],
      notes: [
        `built-in voices: ${BUILTIN_VOICES.join(', ')}`,
        'input is capped at 4096 characters by the schema',
        'instructions does not work with tts-1 / tts-1-hd',
      ],
    };
  },

  async synthesise(utterance, opts = {}) {
    // Credentials first: the honest message is "no key", not "spend blocked".
    throw noCredentialError(this);
  },
};
