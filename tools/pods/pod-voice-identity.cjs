/**
 * pod-voice-identity.cjs — a voice id → a NAME and a GENDER a human can read.
 *
 * Built 2026-08-24 for the pod script viewer. Tom's ask was "the assigned voice
 * (NAME and GENDER, not a raw voice id)", and the estate has no voice-gender
 * COLUMN anywhere — gender is derived from the two shipped catalogues
 * (tools/pod-voices-xai.json, tools/pod-voices-azure.json) plus the small
 * ElevenLabs top-up list that lives in code in tools/pod-voice-coverage.cjs.
 *
 * THE HONESTY CONTRACT, and it is the whole point of this file existing rather
 * than an inline lookup: a voice that is in a live cast but in none of the
 * catalogues resolves to gender `null` with `genderSource: 'unknown'`. It is
 * NEVER guessed to make a display tidy, and a caller must treat an unknown as
 * "cannot check" rather than "passes" — a same-gender exchange that cannot be
 * proved is not thereby a good one. `listening_pods.speakers[char].gender` is
 * available as a LAST resort (`genderSource: 'cast-map'`), and it is weaker
 * evidence than the catalogue on purpose: it is the CHARACTER's gender as the
 * script writes them, not the gender of the voice that ended up cast, and the
 * two came apart exactly when casting went wrong.
 *
 * Voice ids appear both bare and provider-prefixed in the same course
 * (`ara`/`xai_ara`, `es-ES-ElviraNeural`/`azure_es-ES-ElviraNeural`), so both
 * prefixes come off before lookup — the same normalisation pod-cast-gate.cjs
 * does, for the same reason.
 *
 * Pure: two JSON requires at load, no DB, no env, no network.
 */

'use strict'

const path = require('path')

const XAI = require(path.join(__dirname, '..', 'pod-voices-xai.json'))
const AZURE = require(path.join(__dirname, '..', 'pod-voices-azure.json'))

/** The ElevenLabs premium top-up, mirrored from tools/pod-voice-coverage.cjs. */
const ELEVEN = [
  { voice_id: 'EXAVITQu4vr4xnSDxMaL', name: 'Sarah', gender: 'f' },
  { voice_id: 'FGY2WhTYpPnrIDTdsKH5', name: 'Laura', gender: 'f' },
  { voice_id: 'JBFqnCBsd6RMkjVDRZzb', name: 'George', gender: 'm' },
  { voice_id: 'IKne3meq5aSn9XLyUdCD', name: 'Charlie', gender: 'm' },
  { voice_id: 'CwhRBWXzGAHq8TQ4Fs17', name: 'Roger', gender: 'm' },
]

/** Tom's own xAI clone, the single voice of the whole English/known track. */
const KNOWN_CLONE = { voice_id: 'gfzdpspr5fdp', name: 'Tom', gender: 'm', provider: 'xai' }

const bare = (v) => String(v || '').trim().replace(/^(xai_|azure_)/, '')

/** voice_id (bare, lower-cased) → { name, gender, provider }. Built once. */
const INDEX = (() => {
  const ix = new Map()
  const put = (v, provider) => {
    const id = bare(v && v.voice_id).toLowerCase()
    if (!id || ix.has(id)) return
    ix.set(id, { name: v.name || null, gender: v.gender || null, provider })
  }
  for (const [key, list] of Object.entries(XAI)) {
    if (!Array.isArray(list)) continue
    for (const v of list) put(v, 'xai')
    void key
  }
  for (const bucket of Object.values(AZURE)) {
    if (!bucket || typeof bucket !== 'object') continue
    for (const g of ['f', 'm']) for (const v of bucket[g] || []) put(v, 'azure')
  }
  for (const v of ELEVEN) put(v, 'elevenlabs')
  put(KNOWN_CLONE, 'xai')
  return ix
})()

/**
 * Resolve one voice to something a person can read.
 *
 * @param {string} voiceId          the raw id off the cast map or a clip
 * @param {object} [hints]
 * @param {string} [hints.name]     the name the cast map stored alongside it
 * @param {'f'|'m'|null} [hints.castGender] speakers[char].gender — last resort
 * @returns {{voice_id:string, name:string|null, gender:'f'|'m'|null,
 *            genderSource:'catalogue'|'cast-map'|'unknown', provider:string|null,
 *            resolved:boolean}}
 */
function resolveVoice (voiceId, hints = {}) {
  const id = bare(voiceId)
  const hit = INDEX.get(id.toLowerCase())
  if (hit && hit.gender) {
    return {
      voice_id: id,
      name: hit.name || hints.name || null,
      gender: hit.gender,
      genderSource: 'catalogue',
      provider: hit.provider,
      resolved: true,
    }
  }
  // Not in any catalogue (or catalogued without a gender). The cast map's
  // character gender is the only thing left, and it is explicitly weaker.
  const castGender = hints.castGender === 'f' || hints.castGender === 'm' ? hints.castGender : null
  return {
    voice_id: id,
    name: (hit && hit.name) || hints.name || null,
    gender: castGender,
    genderSource: castGender ? 'cast-map' : 'unknown',
    provider: (hit && hit.provider) || null,
    resolved: Boolean(hit),
  }
}

/** 'f' → 'female voice', matching the PodCastPanel chips. */
function genderLabel (gender) {
  if (gender === 'f') return 'female voice'
  if (gender === 'm') return 'male voice'
  return 'unknown gender'
}

module.exports = { resolveVoice, genderLabel, bare }
