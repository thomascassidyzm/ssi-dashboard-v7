/**
 * The standing intro-reuse step (job #294, reworked job #299 onto Tom's two-part model, ruling
 * r-2026-10-31 "intros are TWO separate audio files").
 *
 * Tom: "All we need is 2 parts: Language specific + {known lego} is... one piece of lang specific, and then
 * the rest." "We only need 'The Finnish for' one time and then we take the second half of every matching prompt."
 * "Always look in the audio we already have before recording anything." NOTHING IS SPLICED OR JOINED HERE: the
 * app plays the two files in sequence (what the player does today is introAssembly.ts in ssi-learning-app —
 * it fetches the pieces and plays them; the course row still has ONE presentation_audio_id slot, so a second-part
 * pointer needs a home that does not exist yet — see plan-course.cjs, GAPS). This module only PLANS POINTERS:
 *   part 1  ONE per-course prefix "The <Language> for", cut once from an existing intro of that course
 *   part 2  the per-ENGLISH-prompt second half "'X', is:" (or "'X', as in — 'C', is:") from whichever course has it
 * The unit of reuse is the second half, keyed on the English prompt — not a full intro.
 *
 * The "as in" decision stays keyed on the English prompt (Tom: "We only use 'as in' when the known language
 * context needs disambiguating"): decided once, estate-wide, tie => STRIP.
 *
 * PURE (no DB, no network). Seeder: seed-store.cjs. Course step: plan-course.cjs. Store: as-in-store.json.
 *
 * Store key = normalised English prompt. Per key:
 *   decision/votes/scores/conflict/gradedAt/sources   the as-in call and how the records split
 *   bare   an existing Tom-006 WHOLE intro "The <L> for: 'X', is:" — its second half is the cut after word 3 ("for")
 *          using course_audio.word_timings (the recipe in ssi-learning-app tools/intro-bank/afr-remake/remake.mjs)
 *   ctx    { normalisedContext: clip } — whole intros "... 'X', as in — 'C', is:", cut the same way
 */
const T6 = 'cartesia_d293d509-eb96-4df4-8cfd-80a693aa49a9'
const BREAK = '<break time="300ms"/>'

/** Normalised English text: lower case, straight quotes, no tags, no edge punctuation, single spaces. */
function norm(t) {
  return String(t == null ? '' : t)
    .replace(/<[^>]*>/g, ' ')
    .replace(/[‘’‛]/g, "'").replace(/[“”]/g, '"')
    .toLowerCase()
    .replace(/^[\s'".,!?;:—–-]+|[\s'".,!?;:—–-]+$/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * Build the store from graded records:
 *   { x, ctx, keep, score, course, lego_id, job, gradedAt, clipId, text }
 * keep = the decision that was APPLIED (score 3-5 kept; 1-2 and unscored stripped — keepAsIn in
 * tools/audio/tom006-intros-plan.cjs). clipId = the Tom-006 clip that intro now plays (null if none).
 */
function buildStore(records) {
  const entries = {}
  for (const r of records) {
    const k = norm(r.x); if (!k) continue
    const e = entries[k] || (entries[k] = { x: r.x, votes: { keep: 0, strip: 0 }, scores: {}, sources: [], gradedAt: null, bare: null, ctx: {} })
    // only an intro that HAD a context is a vote: a bare intro never asked the as-in question
    if (r.ctx) {
      e.votes[r.keep ? 'keep' : 'strip']++
      const s = r.score == null ? 'unscored' : String(r.score)
      e.scores[s] = (e.scores[s] || 0) + 1
    }
    e.sources.push(`${r.course}:${r.lego_id}:${r.score == null ? '-' : r.score}:${r.job}`)
    if (r.gradedAt && (!e.gradedAt || r.gradedAt > e.gradedAt)) e.gradedAt = r.gradedAt
    if (r.clipId) {
      if (r.keep && r.ctx) { const c = norm(r.ctx); if (!e.ctx[c]) e.ctx[c] = { id: r.clipId, course: r.course, text: r.text } }
      else if (!r.keep && !e.bare) e.bare = { id: r.clipId, course: r.course, text: r.text }
    }
  }
  let conflicts = 0
  for (const e of Object.values(entries)) {
    e.decision = e.votes.keep > e.votes.strip ? 'keep' : 'strip'   // tie (incl. 0:0, never graded) => strip
    e.conflict = e.votes.keep > 0 && e.votes.strip > 0
    if (e.conflict) conflicts++
  }
  return { version: 1, voice: T6, keys: Object.keys(entries).length, conflicts, entries }
}

/** "The <L> for: 'X', as in — 'C', is:" / "The <L> for: 'X', is:" -> { x, ctx }; null when it does not parse. */
function parseIntro(text) {
  if (!text) return null
  const s = String(text).replace(/<break[^>]*>/gi, '').replace(/\s+/g, ' ').trim()
  const m = s.match(/^The [\w ]+? for:?\s*'(.*?)'\s*,?\s*-?\s*as in\s*[—–-]?\s*'(.*)'\s*,?\s*is:?$/)
  if (m) return { x: m[1], ctx: m[2] }
  const b = s.match(/^The [\w ]+? for:?\s*'(.*)'\s*,?\s*(?:is said like this|is given as|is):?$/)
  return b ? { x: b[1], ctx: null } : null
}

const secondHalfText = (x, ctx) => `'${x}'${ctx ? `, as in — '${ctx}'` : ''}, is:`

/** Where a cut is made in a whole Tom-006 intro "The <L> for: 'X', …": words[0..2] are the prefix, words[3..] the second half. */
const CUT = { afterWord: 3, note: 'cut after the word "for" using course_audio.word_timings; words[2] must end "for"' }

/**
 * Plan the SECOND PART of one LEGO's intro. lego = { lego_id, known_text, ctx (the seed sentence = the as-in context),
 * currentText, currentAudioId }. standalone = { [normalisedSecondHalfText]: clipId } — second halves that already exist as
 * their own clip in the library (looked up by plan-course through the render door in dryRun). Returns
 *   { lego_id, x, match, conflict, secondText, part2: { source, clip?, donorCourse?, cut?, ttsText?, ttsChars } }
 * part2.source (zero TTS unless 'new-recording'):
 *   existing-second-part   a standalone clip already exists — point at it, nothing to do
 *   split-existing-whole   no standalone yet; cut the second half out of another course's whole intro (one-time, zero TTS)
 *   split-own-whole        same, from the LEGO's OWN current intro (its as-in already says exactly what is wanted)
 *   new-recording          no clip anywhere says it: render through POST /api/audio/render (later stage, never here)
 * There is NO splice/join step: the player plays prefix then second part.
 */
function planTwoPart(store, lego, standalone = {}) {
  const e = store.entries[norm(lego.known_text)] || null
  const cur = parseIntro(lego.currentText)
  const ctx = lego.ctx || (cur && cur.ctx) || null
  const keep = !!(e && e.decision === 'keep' && ctx)
  const secondText = secondHalfText(lego.known_text, keep ? ctx : null)
  const base = { lego_id: lego.lego_id, x: lego.known_text, match: e ? e.decision : null, conflict: !!(e && e.conflict), secondText }
  const alone = standalone[norm(secondText)]
  if (alone) return { ...base, part2: { source: 'existing-second-part', clip: alone, ttsChars: 0 } }
  let donor = null
  if (e) donor = keep ? e.ctx[norm(ctx)] : e.bare
  if (donor) return { ...base, part2: { source: 'split-existing-whole', clip: donor.id, donorCourse: donor.course, cut: CUT, ttsChars: 0 } }
  const ownMatches = cur && (keep ? cur.ctx && norm(cur.ctx) === norm(ctx) : !cur.ctx)
  if (e && ownMatches && lego.currentAudioId) return { ...base, part2: { source: 'split-own-whole', clip: lego.currentAudioId, donorCourse: 'own', cut: CUT, ttsChars: 0 } }
  return { ...base, part2: { source: 'new-recording', ttsText: secondText, ttsChars: secondText.length } }
}

/** Roll a course's plans into the report. byLego counts LEGOs; distinct counts English second halves (one split/recording serves every course). */
function summariseTwoPart(plans, { lang, prefix }) {
  const r = { intros: plans.length, matched: 0, keep: 0, strip: 0, unmatched: 0, conflicts: 0, bySource: {}, distinctBySource: {}, ttsChars: 0, ttsNeeded: [], splice: 0 }
  const seen = {}
  for (const p of plans) {
    const s = p.part2.source
    r.bySource[s] = (r.bySource[s] || 0) + 1
    const k = norm(p.secondText)
    if (!seen[k]) { seen[k] = 1; r.distinctBySource[s] = (r.distinctBySource[s] || 0) + 1; if (s === 'new-recording') { r.ttsChars += p.part2.ttsChars; r.ttsNeeded.push({ lego_id: p.lego_id, x: p.x, text: p.part2.ttsText }) } }
    if (p.match) { r.matched++; r[p.match]++ } else r.unmatched++
    if (p.conflict) r.conflicts++
  }
  r.prefix = { text: `The ${lang} for`, ...prefix }
  r.matchRate = r.intros ? r.matched / r.intros : 0
  return r
}

module.exports = { T6, BREAK, CUT, norm, buildStore, parseIntro, planTwoPart, summariseTwoPart, secondHalfText }
