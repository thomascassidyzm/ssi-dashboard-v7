/**
 * pods-cast.cjs — pure logic for the pod human-recording CAST
 * (keystone: docs/voice-engine/design/pods-recording-model.md §1).
 *
 * The cast maps pod SPEAKER characters → human voices and lives ADDITIVELY in
 * courses.voice_config.podCast:
 *
 *   { "podCast": { "<speakerName>": { "voiceId": "human_catrin_cym",
 *                                     "name": "Catrin", "email": "..." } } }
 *
 * voice_config drives LIVE TTS SERVING via voices.* — podCast is an additive
 * key serving never reads (same safety contract as the roster's
 * previousVoice). Every transform here is SURGICAL, exactly like
 * voice-slots.cjs slot merges: deep-clone, touch only the podCast entries
 * being written, preserve every other key byte-for-byte.
 *
 * The EXPLAINER voice (known-language lines + explainer_text) is its own cast
 * entry under the reserved key "__explainer__".
 *
 * Pure module — no DB, no I/O. Vocabulary: known / target / seed.
 */

'use strict'

const { canonicalSpeakerName, extractGenderMarker } = require('../../tools/pod-voice-colour-n.cjs')

/** Reserved cast key for the explainer voice (keystone §1). */
const EXPLAINER_SPEAKER = '__explainer__'

/** Deep-clone helper (voice_config objects are plain JSON). */
function clone(obj) {
  return obj == null ? obj : JSON.parse(JSON.stringify(obj))
}

/**
 * Surgically merge cast updates into a voice_config. NON-DESTRUCTIVE:
 * - returns a new object; the input is never mutated
 * - every key outside voice_config.podCast is preserved exactly
 * - inside podCast, only the speakers named in `updates` change; existing
 *   entry keys not named in the update are preserved (mirror of
 *   assignVoiceToSlot's inside-the-slot behaviour)
 * - `updates[speaker] = null` removes that speaker's cast entry
 *
 * @param {object|null} voiceConfig - raw courses.voice_config (may be null)
 * @param {Object<string, {voiceId:string, name?:string|null, email?:string|null}|null>} updates
 * @returns {object} new voice_config
 */
function mergePodCast(voiceConfig, updates) {
  if (!updates || typeof updates !== 'object' || Array.isArray(updates)) {
    throw new Error('mergePodCast: updates must be an object of speaker → entry|null')
  }
  const config = clone(voiceConfig) || {}
  if (!config.podCast || typeof config.podCast !== 'object') config.podCast = {}

  for (const [speaker, entry] of Object.entries(updates)) {
    if (!speaker || !speaker.trim()) throw new Error('mergePodCast: empty speaker name')
    if (entry === null) {
      delete config.podCast[speaker]
      continue
    }
    if (!entry || typeof entry !== 'object' || typeof entry.voiceId !== 'string' || !entry.voiceId.trim()) {
      throw new Error(`mergePodCast: entry for "${speaker}" needs a voiceId (or null to remove)`)
    }
    const existing = config.podCast[speaker] || {}
    const next = { ...existing, voiceId: entry.voiceId.trim() }
    // name/email: only touched when present in the update; empty string clears.
    for (const key of ['name', 'email']) {
      if (key in entry) {
        if (entry[key]) next[key] = String(entry[key])
        else delete next[key]
      }
    }
    config.podCast[speaker] = next
  }
  return config
}

/**
 * Resolve the cast entry for a raw sentence speaker (variants like
 * "Neighbour (8 am)" collapse to their canonical character).
 * @returns {{voiceId:string, name?:string, email?:string}|null}
 */
function castVoiceFor(podCast, rawSpeaker) {
  if (!podCast || typeof podCast !== 'object') return null
  const canon = canonicalSpeakerName(rawSpeaker)
  if (!canon) return null
  if (podCast[canon] && podCast[canon].voiceId) return podCast[canon]
  // Raw-name fallback for casts keyed before canonicalisation.
  if (podCast[rawSpeaker] && podCast[rawSpeaker].voiceId) return podCast[rawSpeaker]
  return null
}

/**
 * Character inventory across a course's pods: who appears, how many recording
 * items each carries, plus the explainer workload.
 *
 * Line counting matches the recording plan: a glue chain (glue_to_next) by
 * one character is ONE item. Gender resolution per recon §4: the pods'
 * generation-side speakers entry wins, then explicit (F)/(M)/(N) markers.
 *
 * @param {{pods:Array, sentences:Array}} args
 *   pods: listening_pods rows ({ id, speakers }) — speakers jsonb optional
 *   sentences: listening_pod_sentences rows across those pods
 * @returns {{
 *   speakers: Array<{speaker:string, gender:string, variants:string[],
 *                    lineCount:number, podIds:string[]}>,
 *   explainer: { knownLines:number, explainerLines:number },
 * }}
 */
function speakerInventory({ pods, sentences }) {
  const rows = [...(sentences || [])].sort((a, b) =>
    a.pod_id < b.pod_id ? -1 : a.pod_id > b.pod_id ? 1 : (a.global_order || 0) - (b.global_order || 0))

  // Generation-side gender (listening_pods.speakers[canon].gender), any pod.
  const genderFromPods = new Map()
  for (const pod of pods || []) {
    const sp = pod && pod.speakers
    if (!sp || typeof sp !== 'object') continue
    for (const [canon, entry] of Object.entries(sp)) {
      if (canon === '_default') continue
      const g = entry && entry.gender
      if ((g === 'f' || g === 'm') && !genderFromPods.has(canon)) genderFromPods.set(canon, g)
    }
  }

  const byCanon = new Map()
  let knownLines = 0
  let explainerLines = 0
  let prev = null
  for (const s of rows) {
    const canon = canonicalSpeakerName(s.speaker)
    const continuesGlue = prev && prev.pod_id === s.pod_id && prev.glue_to_next === true &&
      canonicalSpeakerName(prev.speaker) === canon
    if (!continuesGlue && (s.known_text || '').trim()) knownLines++
    if ((s.explainer_text || '').trim()) explainerLines++
    if (canon) {
      if (!byCanon.has(canon)) byCanon.set(canon, { variants: new Set(), lineCount: 0, podIds: new Set() })
      const rec = byCanon.get(canon)
      rec.variants.add(s.speaker)
      rec.podIds.add(s.pod_id)
      if (!continuesGlue) rec.lineCount++
    }
    prev = s
  }

  const speakers = [...byCanon.entries()].map(([canon, rec]) => {
    let gender = genderFromPods.get(canon) || null
    if (!gender) {
      for (const v of rec.variants) {
        const marked = extractGenderMarker(v)
        if (marked) { gender = marked; break }
      }
    }
    return {
      speaker: canon,
      gender: gender || 'n',
      variants: [...rec.variants],
      lineCount: rec.lineCount,
      podIds: [...rec.podIds],
    }
  }).sort((a, b) => b.lineCount - a.lineCount || (a.speaker < b.speaker ? -1 : 1))

  return { speakers, explainer: { knownLines, explainerLines } }
}

/**
 * Does any pod carry generation-side slot colouring in listening_pods.speakers?
 * (Keystone addendum 2026-06-11: when it does, the casting UI and recording
 * plan CONSUME it verbatim — the solver is only a fallback.)
 */
function hasGenerationColouring(pods) {
  for (const pod of pods || []) {
    const sp = pod && pod.speakers
    if (!sp || typeof sp !== 'object') continue
    for (const [canon, entry] of Object.entries(sp)) {
      if (canon === '_default') continue
      if (entry && entry.target && entry.target.voice_id) return true
    }
  }
  return false
}

/**
 * Build the update patch for a community script edit (pre- or post-recording).
 * Editing a line clears THAT line's audio pointer so the recording plan
 * resurfaces it (recorded=false) and TTS refills stay null-only — the old
 * audio ROW is never deleted (origin guard keeps human takes; provenance
 * keeps history). explainer_text edits clear explainer audio likewise.
 * Returns null when the body carries nothing editable.
 */
function buildSentenceEditPatch(body = {}) {
  const patch = {}
  if (typeof body.target_text === 'string') {
    patch.target_text = body.target_text.trim()
    patch.target_audio_id = null
  }
  if (typeof body.known_text === 'string') {
    patch.known_text = body.known_text.trim()
    patch.known_audio_id = null
  }
  if (typeof body.explainer_text === 'string') {
    // '' is meaningful: "deliberately no explainer" (canon convention)
    patch.explainer_text = body.explainer_text.trim()
    patch.explainer_audio_id = null
  }
  return Object.keys(patch).length ? patch : null
}

module.exports = {
  EXPLAINER_SPEAKER,
  mergePodCast,
  castVoiceFor,
  speakerInventory,
  hasGenerationColouring,
  buildSentenceEditPatch,
}
