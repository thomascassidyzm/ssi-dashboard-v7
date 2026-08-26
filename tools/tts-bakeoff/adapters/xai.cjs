/**
 * xAI — CONTROL (the quality benchmark, and the thing we are leaving).
 * Key present on this box.
 *
 * Mirrors what the repo already sends. Matched against services/tts-service.cjs
 * generateXai() (lines 407-479, read 2026-08-26):
 *   - POST https://api.x.ai/v1/tts                                    — :449
 *   - headers Authorization: Bearer, Content-Type: application/json   — :453-456
 *   - body { text, voice_id, language,
 *            output_format: { codec, sample_rate, bit_rate } }        — :436-445
 *   - repo defaults voice 'eve', codec mp3, 24000 Hz, 128000 bps      — :410-415
 *   - 15000-character request cap                                     — :421-422
 *
 * Two repo behaviours carried over deliberately, because both are findings the
 * bake-off must not lose:
 *   1. language MUST be explicit. The repo warns on language='auto' because the
 *      multilingual voices are English-dominant and read cross-language words
 *      with English phonology (ita pilot 2026-07-10, tts-service.cjs:425-430).
 *      The bake-off always sends an explicit code — otherwise the control gets
 *      a handicap that is our fault, not xAI's.
 *   2. xAI intermittently returns silent stubs. The repo carries a whole
 *      stub-rate/cooldown circuit breaker for it (tts-service.cjs:133-181).
 *      That is axis-G evidence in its own right and it is why the runner hashes
 *      bytes AND records length: a stub is a valid-looking 200 with no speech.
 */
const { envRef, resolveHeaders, assertSpendAllowed, shortLang } = require('../lib/adapter-utils.cjs');

module.exports = {
  id: 'xai',
  displayName: 'xAI TTS (control: quality benchmark — the incumbent we are leaving)',
  role: 'control',
  requiredEnv: ['XAI_API_KEY'],
  stubbed: false,
  supportsSeed: false,
  supportsTemperature: false,
  supportsVersionPinning: false,
  versionPinningNote:
    'NONE that we can find. /v1/tts takes no model field at all — text, voice_id, language, output_format and ' +
    'nothing else. There is no snapshot id, no version header, no dated voice. So the incumbent we are being ' +
    'asked to match on quality gives us NO pinning whatsoever, which is worth stating plainly: "near-Azure ' +
    'repeatability" is a step UP from where we are, not a step down. Recorded as null in metadata with this note.',
  docs: ['https://docs.x.ai/docs/api-reference (verify in phase 2 — this adapter is matched to the repo\'s live call in services/tts-service.cjs, which is the stronger evidence)'],
  languageSupport(iso3) {
    if (iso3 === 'cym') {
      return { supported: null, note: 'No published xAI language list was fetched. The estate has never voiced Welsh with xAI — cym_n/cym_s are Azure plus human recordings. Unknown; must be heard.' };
    }
    return { supported: null, note: 'No published xAI TTS language list fetched. 29 courses carry xAI in voice_config covering eng deu fra ita jpn kor spa por zho fin pdc — that is evidence of use, not of a supported list.' };
  },

  buildRequest(utterance, opts = {}) {
    const language = opts.language || shortLang(utterance.language) || 'auto';
    if (language === 'auto') {
      // Not a throw — the runner records it — but it must never pass silently.
      // See tts-service.cjs:425-430.
      opts.warnings = [...(opts.warnings || []), 'language=auto: xAI voices are English-dominant under auto and will mispronounce cross-language words'];
    }
    const body = {
      text: utterance.text,
      voice_id: opts.voice || 'eve',
      language,
      output_format: {
        codec: opts.codec || 'mp3',
        sample_rate: opts.sampleRate || 24000,
        bit_rate: opts.bitRate || 128000,
      },
    };
    return {
      transport: 'http',
      endpoint: 'https://api.x.ai/v1/tts',
      method: 'POST',
      headers: {
        Authorization: `Bearer ${envRef('XAI_API_KEY')}`,
        'Content-Type': 'application/json',
      },
      body,
      responseKind: 'audio-bytes',
      unsupportedOptions: [
        ...(opts.seed != null ? ['seed — /v1/tts documents no seed field'] : []),
        ...(opts.temperature != null ? ['temperature — /v1/tts documents no temperature field'] : []),
      ],
      notes: [
        'request text is capped at 15000 characters (tts-service.cjs:421)',
        'silent-stub risk: a 200 can carry inaudible audio; check byte length against bit_rate/8',
      ],
    };
  },

  async synthesise(utterance, opts = {}) {
    assertSpendAllowed(this, opts);
    const req = this.buildRequest(utterance, opts);
    const headers = resolveHeaders(req.headers, this.id);
    const res = await fetch(req.endpoint, { method: req.method, headers, body: JSON.stringify(req.body) });
    if (!res.ok) throw new Error(`xAI TTS ${res.status}: ${await res.text()}`);
    const audioBuffer = Buffer.from(await res.arrayBuffer());
    const bytesPerSecond = Math.max(1, Math.round((req.body.output_format.bit_rate) / 8));
    return {
      audioBuffer,
      metadata: {
        http_status: res.status,
        content_type: res.headers.get('content-type'),
        // < 300 ms of audio at the requested bitrate is the repo's stub signature.
        suspected_silent_stub: audioBuffer.length < Math.round(0.3 * bytesPerSecond),
      },
    };
  },
};
