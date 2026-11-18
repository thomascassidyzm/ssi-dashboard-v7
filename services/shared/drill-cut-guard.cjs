/**
 * DRILL IS CUT, NEVER RECORDED AGAIN — the duplicate-stop on the one render route (job #338).
 *
 * Tom, 2026-10-24: "we need to make sure we're not recording multiple drill clips. We agreed that drill clips
 * would be extracted from the immersion clip (the full clip) by intelligent editing." Standing since
 * r-2026-09-30-pods-record-one-take-per-turn: a pod turn is recorded ONCE and its Drill clips are cut from that
 * take (tools/pods/drill-cuts.cjs, splice-sentence-clips.cjs).
 *
 * The route is library-first, so a sentence clip that has already been cut is simply linked. What it could still
 * do is PAY for a second performance of one sentence of a served pod turn, in the very voice the turn was recorded
 * in, when nobody has cut it yet. That second take is exactly the duplicate Tom asked to stop, and it can differ
 * audibly from the immersion take the learner also hears. So the route refuses it (409 DRILL_IS_CUT) and names the
 * turn clip to cut it from.
 *
 * Deliberately NOT refused: the same words in ANOTHER voice. A main-flow line has two target seats in two voices
 * by design, and only one of them can be the pod's voice; whether the main flow should play the pod's cut is a
 * separate, learner-facing decision (job #338 plan), not something a guard should take on its own.
 *
 * Pure rule here; the database read lives in phase8 buildRenderDeps (immersionTurn).
 */
const { normalizeForAudio } = require('./text-normalize.cjs')

/** The player's boundary (podSentenceSplit.ts) plus CJK stops, which the player splits by clip instead. */
const BOUNDARY = /(?<=[.!?])\s+|(?<=[。！？])\s*/
const sentencesOf = (t) => String(t || '').split(BOUNDARY).map((s) => s.trim()).filter(Boolean)

/** The words to look for in pod text: trimmed, trailing stop dropped (the stored key drops it too). */
function searchTerm(text) {
  return String(text || '').trim().replace(/[.!?。？！]+$/, '').trim()
}

/**
 * The ILIKE needle. findImmersionTurn compares NORMALISED text, so a needle holding an apostrophe, comma or other
 * punctuation can miss a pod row that spells it differently (curly vs straight quote) and the second paid take goes
 * ahead. The longest run of letters/digits survives any such spelling difference; the exact check stays in findImmersionTurn.
 */
function searchSegment(text) {
  const runs = searchTerm(text).split(/[^\p{L}\p{N}\p{M}]+/u).filter(Boolean)
  return runs.reduce((a, b) => (b.length > a.length ? b : a), '')
}

/** Every row of a query, page by page (a common sentence matches far more rows than any single-page limit). */
async function fetchAllPages(page, { size = 1000, max = 20000 } = {}) {
  const all = []
  for (let from = 0; from < max; from += size) {
    const rows = await page(from, from + size - 1)
    all.push(...(rows || []))
    if (!rows || rows.length < size) break
  }
  return all
}

/** The words made safe inside an ILIKE '%…%' pattern: \, % and _ are literal. */
const likeEscape = (s) => String(s).replace(/[\\%_]/g, (m) => '\\' + m)

/** One voice, whatever its spelling: provider prefix dropped (xAI custom ids are stored both ways). */
const voiceKey = (v) => String(v || '').trim().replace(/^(xai|azure|cartesia|elevenlabs|google|openai)_/i, '').toLowerCase()

/**
 * Pure. Of these candidate pod rows, the turn that holds `text` as ONE of two or more sentences and whose turn clip
 * is in `language` (and, when `voice` is given, in that voice) — or null.
 * @param rows [{ id, global_order, course_code, target_text, target_audio_id, clip: { language, voice_id } | null }]
 */
function findImmersionTurn(rows, { language, text, voice }) {
  const want = normalizeForAudio(text)
  if (!want) return null
  for (const r of rows || []) {
    if (!r || !r.target_audio_id || !r.clip || r.clip.language !== language) continue
    if (voice && voiceKey(r.clip.voice_id) !== voiceKey(voice)) continue // another voice's turn must not shadow a same-voice one
    const sents = sentencesOf(r.target_text)
    if (sents.length < 2) continue
    if (sents.some((s) => normalizeForAudio(s) === want)) {
      return { rowId: r.id, order: r.global_order ?? null, courseCode: r.course_code, audioId: r.target_audio_id, voiceId: r.clip.voice_id, sentences: sents.length }
    }
  }
  return null
}

/** Pure. The refusal, or null when the render may go ahead (no turn, or the turn is in another voice). */
function drillCutRefusal(turn, { voiceId, text }) {
  if (!turn || voiceKey(turn.voiceId) !== voiceKey(voiceId)) return null
  return {
    status: 409,
    code: 'DRILL_IS_CUT',
    turn,
    message: `"${String(text).slice(0, 80)}" is one sentence of pod turn ${turn.rowId} (${turn.courseCode}), already recorded in this voice as ${turn.audioId}. ` +
      'A Drill clip is CUT from that take, never recorded again (Tom 2026-10-24, job #338): ' +
      `node tools/pods/splice-sentence-clips.cjs ${turn.courseCode}${turn.order != null ? ` --orders=${turn.order}` : ''} cuts it for free.`,
  }
}

module.exports = { sentencesOf, searchTerm, searchSegment, fetchAllPages, likeEscape, voiceKey, findImmersionTurn, drillCutRefusal }
