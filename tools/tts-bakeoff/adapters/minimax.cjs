/**
 * MiniMax Speech (t2a_v2) — CANDIDATE. STUBBED: no MINIMAX_API_KEY on this box.
 *
 * Request shape from vendor docs fetched 2026-08-26:
 *   https://platform.minimax.io/docs/api-reference/speech-t2a-http
 *
 * GATE ZERO WARNING: the language_boost enum (~30 values) does NOT list Welsh.
 * Also note the response is NOT audio bytes — it is JSON with the audio
 * hex-encoded at data.audio, so the runner has to decode before hashing.
 */
const { envRef, resolveHeaders, noCredentialError, assertSpendAllowed } = require('../lib/adapter-utils.cjs');

const DEFAULT_MODEL = 'speech-2.8-hd';

/** language_boost values seen in the T2A doc, mapped from our ISO-639-3 codes. */
const BOOST = {
  eng: 'English', zho: 'Chinese', yue: 'Chinese,Yue', jpn: 'Japanese', kor: 'Korean',
  spa: 'Spanish', fra: 'French', deu: 'German', ita: 'Italian', por: 'Portuguese',
  nld: 'Dutch', rus: 'Russian', ara: 'Arabic', tur: 'Turkish', ukr: 'Ukrainian',
  vie: 'Vietnamese', ind: 'Indonesian', tha: 'Thai', pol: 'Polish', ron: 'Romanian',
  ell: 'Greek', ces: 'Czech', fin: 'Finnish', hin: 'Hindi',
};

module.exports = {
  id: 'minimax',
  displayName: 'MiniMax Speech',
  role: 'candidate',
  requiredEnv: ['MINIMAX_API_KEY', 'MINIMAX_GROUP_ID'],
  stubbed: true,
  stubReason: 'No MINIMAX_API_KEY / MINIMAX_GROUP_ID in the repo-root .env on watson-1 (verified 2026-08-26). Phase-2 blocker.',
  supportsSeed: false,
  supportsTemperature: false,
  supportsVersionPinning: 'partial',
  versionPinningNote:
    'Only the model id pins anything: speech-2.8-hd / 2.8-turbo / 2.6-hd / 2.6-turbo / 02-hd / 02-turbo / 01-hd / 01-turbo. ' +
    'These are PRODUCT generations, not dated snapshots — nothing in the doc says speech-2.8-hd is frozen, so a silent ' +
    'in-place model update cannot be ruled out. No dated snapshot id is documented. Treat as WEAK pinning and put the ' +
    'question to the vendor in phase 2.',
  docs: ['https://platform.minimax.io/docs/api-reference/speech-t2a-http'],
  languageSupport(iso3) {
    const boost = BOOST[iso3];
    return {
      supported: Boolean(boost),
      note: boost
        ? `language_boost "${boost}" is documented (platform.minimax.io T2A HTTP, fetched 2026-08-26).`
        : `no language_boost value for "${iso3}" in the documented enum (fetched 2026-08-26). For cym this is a GATE ZERO failure — Welsh is absent from the list.`,
    };
  },

  buildRequest(utterance, opts = {}) {
    const groupId = process.env.MINIMAX_GROUP_ID || '${env:MINIMAX_GROUP_ID}';
    const body = {
      model: opts.model || DEFAULT_MODEL,
      text: utterance.text,
      stream: false,
      language_boost: BOOST[utterance.language || opts.language] || 'auto',
      output_format: 'hex',
      voice_setting: {
        voice_id: opts.voice,
        speed: opts.speed != null ? opts.speed : 1.0,
        vol: 1.0,
        pitch: 0,
        ...(opts.emotion ? { emotion: opts.emotion } : {}),
      },
      audio_setting: {
        sample_rate: opts.sampleRate || 32000,
        bitrate: opts.bitRate || 128000,
        format: opts.codec || 'mp3',
        channel: 1,
      },
    };
    return {
      transport: 'http',
      // api-uw.minimax.io is the western-US host; api.minimax.io is the global one.
      endpoint: `https://api-uw.minimax.io/v1/t2a_v2?GroupId=${groupId}`,
      method: 'POST',
      headers: {
        Authorization: `Bearer ${envRef('MINIMAX_API_KEY')}`,
        'Content-Type': 'application/json',
      },
      body,
      // NOT raw bytes: JSON envelope, audio hex at data.audio.
      responseKind: 'json-hex-audio',
      responseAudioPath: 'data.audio',
      unsupportedOptions: [
        ...(opts.seed != null ? ['seed — t2a_v2 documents no seed field'] : []),
        ...(opts.temperature != null ? ['temperature — t2a_v2 documents no temperature field'] : []),
      ],
    };
  },

  async synthesise(utterance, opts = {}) {
    // Credentials first: the honest message is "no key", not "spend blocked".
    throw noCredentialError(this);
  },
};
