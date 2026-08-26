/**
 * Cartesia Sonic — CANDIDATE. STUBBED: no CARTESIA_API_KEY on this box.
 *
 * Request shape from vendor docs fetched 2026-08-26:
 *   https://docs.cartesia.ai/api-reference/tts/bytes
 *   https://docs.cartesia.ai/build-with-cartesia/models/tts
 *
 * GATE ZERO WARNING: the Sonic 3.5 language list fetched from the model doc is
 *   en fr de es pt zh ja hi it ko nl pl ru sv tr tl bg ro ar cs el fi hr ms sk
 *   da ta uk hu no vi bn th he ka id te gu kn ml mr pa
 * Welsh is NOT in it. On the brief's own rule ("a candidate that cannot do
 * Welsh convincingly is DEAD for canonical course work") that is a documented
 * failure, not a suspicion. Recorded here so it cannot be lost.
 */
const { envRef, resolveHeaders, noCredentialError, assertSpendAllowed, shortLang } = require('../lib/adapter-utils.cjs');

const DEFAULT_MODEL = 'sonic-3.5';
/** Cartesia's own pinning story: sonic-3.5 floats, sonic-3.5-YYYY-MM-DD is pinned. */
const PIN_EXAMPLE = 'sonic-3.5-2026-05-04';
/** Date-versioned API contract, per the api-reference page's header table. */
const API_VERSION = '2026-08-14';

module.exports = {
  id: 'cartesia',
  displayName: 'Cartesia Sonic',
  role: 'candidate',
  requiredEnv: ['CARTESIA_API_KEY'],
  stubbed: true,
  stubReason: 'No CARTESIA_API_KEY in the repo-root .env on watson-1 (verified 2026-08-26). Tom is signing up; phase-2 blocker.',
  supportsSeed: false,
  supportsTemperature: false,
  supportsVersionPinning: true,
  versionPinningNote:
    'TWO independent pins. (1) model snapshot: pass model_id="sonic-3.5-YYYY-MM-DD" instead of the floating ' +
    '"sonic-3.5". (2) API contract: the Cartesia-Version header, a date string. The api-reference page documents ' +
    'the header; the models guide does not mention it — docs disagree, so verify against a live 401/400 response ' +
    'in phase 2 before trusting either. Best pinning story of the candidate set on paper.',
  docs: [
    'https://docs.cartesia.ai/api-reference/tts/bytes',
    'https://docs.cartesia.ai/build-with-cartesia/models/tts',
  ],
  languageSupport(iso3) {
    const listed = new Set(('en fr de es pt zh ja hi it ko nl pl ru sv tr tl bg ro ar cs el fi hr ms sk da ta uk hu no vi bn th he ka id te gu kn ml mr pa').split(' '));
    const code = shortLang(iso3);
    return {
      supported: listed.has(code),
      note: listed.has(code)
        ? `"${code}" is in the Sonic 3.5 language list (docs.cartesia.ai models/tts, fetched 2026-08-26).`
        : `"${code}" is NOT in the published Sonic 3.5 language list (fetched 2026-08-26). For cym this is a GATE ZERO failure.`,
    };
  },

  buildRequest(utterance, opts = {}) {
    const body = {
      model_id: opts.model || DEFAULT_MODEL,
      transcript: utterance.text,
      voice: { mode: 'id', id: opts.voice },
      output_format: {
        container: opts.container || 'wav',
        encoding: opts.encoding || 'pcm_s16le',
        sample_rate: opts.sampleRate || 44100,
      },
      language: shortLang(utterance.language || opts.language),
    };
    if (opts.speed != null || opts.emotion) {
      body.generation_config = {};
      if (opts.speed != null) body.generation_config.speed = opts.speed;
      if (opts.emotion) body.generation_config.emotion = opts.emotion;
    }
    if (opts.pronunciationDictId) body.pronunciation_dict_id = opts.pronunciationDictId;

    return {
      transport: 'http',
      endpoint: 'https://api.cartesia.ai/tts/bytes',
      method: 'POST',
      headers: {
        Authorization: `Bearer ${envRef('CARTESIA_API_KEY')}`,
        'Cartesia-Version': opts.apiVersion || API_VERSION,
        'Content-Type': 'application/json',
      },
      body,
      responseKind: 'audio-bytes',
      unsupportedOptions: pinUnsupported(opts),
    };
  },

  async synthesise(utterance, opts = {}) {
    // Credentials first: the honest message is "no key", not "spend blocked".
    throw noCredentialError(this); // no key exists; nothing to call.
  },
};

function pinUnsupported(opts) {
  const out = [];
  if (opts.seed != null) out.push('seed — Cartesia /tts/bytes documents no seed field; request is NOT reproducible by seed');
  if (opts.temperature != null) out.push('temperature — Cartesia /tts/bytes documents no temperature field');
  return out;
}
