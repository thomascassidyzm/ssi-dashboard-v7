/**
 * Azure Speech — CONTROL (the consistency benchmark). Key present on this box.
 *
 * Mirrors what the repo already sends. Matched against services/tts-service.cjs
 * generateAzure() (lines 300-360, read 2026-08-26):
 *   - SSML envelope <speak version="1.0" xmlns=... xml:lang="en-US"><voice name=...>
 *     <prosody rate="+N%">…</prosody></voice></speak>        — tts-service.cjs:352-359
 *   - output format Audio16Khz32KBitRateMonoMp3               — tts-service.cjs:330
 *   - subscriptionKey + region from config                    — tts-service.cjs:329
 * The repo calls the microsoft-cognitiveservices-speech-sdk, not REST. The SDK
 * has no serialisable "request body", so buildRequest() emits the DOCUMENTED
 * REST EQUIVALENT of that same SSML call, which is reviewable and is what the
 * bake-off metadata needs. Endpoint/header/format names verified against
 * https://learn.microsoft.com/en-us/azure/ai-services/speech-service/rest-text-to-speech
 * (fetched 2026-08-26).
 *
 * The repo's two TTS-input-only transforms — applyRegenerationVariation() and
 * applyShortWordHint() (tts-service.cjs:313-314) — are DELIBERATELY NOT applied
 * here. A bake-off must compare providers on identical input text; a
 * repo-specific pre-transform would silently advantage Azure.
 */
const { envRef, httpSynthesise } = require('../lib/adapter-utils.cjs');

/** The SDK enum value the repo uses, in its REST header spelling. */
const OUTPUT_FORMAT = 'audio-16khz-32kbitrate-mono-mp3';

function escapeXml(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

module.exports = {
  id: 'azure',
  displayName: 'Azure Speech (control: consistency benchmark)',
  role: 'control',
  requiredEnv: ['AZURE_TTS_KEY', 'AZURE_TTS_REGION'],
  stubbed: false,
  supportsSeed: false,
  supportsTemperature: false,
  supportsVersionPinning: false,
  versionPinningNote:
    'NO pinning of any kind. There is no snapshot id, no dated model, no API-version header on ' +
    '/cognitiveservices/v1. The voice NAME (cy-GB-NiaNeural) is the only identifier, and Microsoft updates ' +
    'neural voice models in place. Azure is the estate\'s consistency benchmark not because it is pinnable but ' +
    'because it is DETERMINISTIC within a model generation — the repo relies on that so hard that it has to inject ' +
    'deliberate text variation to force a different render (applyRegenerationVariation, tts-service.cjs:313). ' +
    'That is the bar the candidates have to clear on axis E, and it is worth being explicit that it is a bar ' +
    'reached by determinism, not by pinning.',
  docs: ['https://learn.microsoft.com/en-us/azure/ai-services/speech-service/rest-text-to-speech'],
  languageSupport(iso3) {
    if (iso3 === 'cym') {
      return {
        supported: true,
        note: 'cy-GB neural voices exist and are in production use: cym_n_for_eng and cym_s_for_eng are both live, Azure-voiced (estate map, 2026-08-26).',
      };
    }
    return { supported: null, note: 'Check the live voice list: GET /cognitiveservices/voices/list on the resource endpoint.' };
  },

  buildRequest(utterance, opts = {}) {
    const region = process.env.AZURE_TTS_REGION || '${env:AZURE_TTS_REGION}';
    const speed = opts.speed != null ? opts.speed : 1.0;
    const pct = Math.round((speed - 1) * 100);
    const rate = pct >= 0 ? `+${pct}%` : `${pct}%`;
    const ssml =
      `<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xml:lang="en-US">` +
      `<voice name="${opts.voice}"><prosody rate="${rate}">${escapeXml(utterance.text)}</prosody></voice></speak>`;

    return {
      transport: 'http',
      endpoint: `https://${region}.tts.speech.microsoft.com/cognitiveservices/v1`,
      method: 'POST',
      headers: {
        'Ocp-Apim-Subscription-Key': envRef('AZURE_TTS_KEY'),
        'Content-Type': 'application/ssml+xml',
        'X-Microsoft-OutputFormat': opts.outputFormat || OUTPUT_FORMAT,
        'User-Agent': 'ssi-tts-bakeoff/1',
      },
      body: ssml,
      bodyKind: 'ssml',
      responseKind: 'audio-bytes',
      unsupportedOptions: [
        ...(opts.seed != null ? ['seed — Azure has no seed; it is deterministic instead'] : []),
        ...(opts.temperature != null ? ['temperature — Azure has no temperature'] : []),
      ],
      notes: [
        'repo path uses the Speech SDK (services/tts-service.cjs:329-332); this is its REST equivalent',
        'repo-side applyRegenerationVariation/applyShortWordHint are intentionally NOT applied in the bake-off',
      ],
    };
  },

  async synthesise(utterance, opts = {}) {
    // Key present on this box, so the spend gate inside httpSynthesise is the
    // only thing standing between phase 1 and a bill. It blocks even with --live.
    return httpSynthesise(this, this.buildRequest(utterance, opts), opts);
  },
};
