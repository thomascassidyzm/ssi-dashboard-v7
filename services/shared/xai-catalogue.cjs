/**
 * xai-catalogue.cjs — the single list of languages xAI actually has voices
 * for, read from tools/pod-voices-xai.json rather than restated by hand.
 *
 * Why this exists: tools/render-fine-knowns.cjs (and siblings) used to
 * hard-code a 17-language XAI_OFFICIAL set that had drifted from the
 * catalogue — da, fi, sv-SE and th had declared xAI voices in
 * tools/pod-voices-xai.json but were being routed away from xAI because the
 * hard-coded list never got the memo. See
 * docs/architecture/AUDIO_PIPELINE_PROVIDERS_FIDELITY_LABS-2026-08-06.md
 * section 1. One list, and it's the one with the voice ids in it.
 */
const catalogue = require('../../tools/pod-voices-xai.json')
const base = (l) => String(l || '').toLowerCase().split('-')[0]

// 'multilingual' is a voice pool, not a language — exclude it from the
// language set. Keys are base-language codes (zh-CN → zh, sv-SE → sv) to
// match callers that look up by base(languageCode), same as the catalogue's
// own consumers.
const XAI_OFFICIAL = new Set(
  Object.keys(catalogue).filter((k) => k !== 'multilingual').map(base)
)

const XAI_VOICES_BY_LANGUAGE = catalogue

module.exports = { XAI_OFFICIAL, XAI_VOICES_BY_LANGUAGE }
