/**
 * The standing as-in intro-reuse step (job #294, Tom 2026-10-31).
 *
 * Tom's rulings (r-2026-10-31-intro-reuse-must-b*, r-2026-10-31-as-in-is-a-known-language):
 *   "We only use 'as in' when the known language context needs disambiguating." — so the keep/strip
 *   decision belongs to the ENGLISH prompt, not to the target course, and is made once, estate-wide.
 *   "We don't need to re-record anything ... copy the part after 'the X for' and place it after
 *   'the Finnish for'." / "We only need 'The Finnish for' One time." — so an intro is
 *   [ONE shared "The <Lang> for" clip per language] + [the second half of an existing Tom-006 intro
 *   for the same English prompt, from any course]. TTS only where no course has that prompt.
 *
 * This module is PURE (no DB, no network): the store is built from records handed in, and the
 * planner takes the store plus one LEGO and returns a plan. Seeder: seed-store.cjs. Course step:
 * plan-course.cjs. Store: as-in-store.json (committed — it IS the record Tom said was missing).
 *
 * Store key = normalised English prompt (the LEGO's known text). Per key:
 *   decision 'keep'|'strip'  the as-in call; majority over every graded record, TIE => STRIP
 *                            (Tom: as-in only when the context genuinely needs it).
 *   votes / scores           how the records split, so a conflict is visible, never silent.
 *   conflict                 true when graded records disagree on keep vs strip.
 *   gradedAt, sources        when and where (course:lego_id:score:job).
 *   bare                     an existing Tom-006 whole intro "The <L> for: 'X', is:" — its second half
 *                            ("'X', is:") is cut after the word "for:" (the cut recipe in
 *                            ssi-learning-app tools/intro-bank/afr-remake/remake.mjs, word timings).
 *   ctx                      { normalisedContext: clip } — Tom-006 intros "... 'X', as in — 'C', is:".
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

/** The text a fresh whole-intro render would cost (what #836 paid per intro). */
const wholeIntroText = (lang, x, ctx) => `The ${lang} for: '${x}'${ctx ? `, as in — '${ctx}'` : ''}, is: ${BREAK}`
const secondHalfText = (x, ctx) => `'${x}'${ctx ? `, as in — '${ctx}'` : ''}, is:`

/**
 * Plan one LEGO intro. lego = { lego_id, known_text, ctx (the seed sentence, the as-in context),
 * currentText (its intro now, may be null) }. Returns
 *   { lego_id, match: 'keep'|'strip'|null, conflict, recipe, donor?, newText, ttsText, ttsChars, avoidedChars }
 * recipes (zero TTS unless 'tts'):
 *   splice     [frame "The <L> for"] + donor second half (cut after "for:")
 *   edit-own   strip: no bare donor exists, so the LEGO's OWN as-in intro has "as in — '…'," edited out
 *   keep-own   keep: no donor with this context, but the LEGO's own intro already says exactly that
 *   tts        nothing to reuse: the second half must be rendered (through POST /api/audio/render)
 */
function planIntro(store, lego, lang) {
  const e = store.entries[norm(lego.known_text)] || null
  const cur = parseIntro(lego.currentText)
  const ctx = lego.ctx || (cur && cur.ctx) || null
  const base = { lego_id: lego.lego_id, x: lego.known_text, match: e ? e.decision : null, conflict: !!(e && e.conflict) }
  if (!e) {
    // never graded anywhere: the house default is strip (unscored = stripped since #794)
    const t = secondHalfText(lego.known_text, null)
    return { ...base, recipe: 'tts', newText: wholeIntroText(lang, lego.known_text, null), ttsText: t, ttsChars: t.length, avoidedChars: 0 }
  }
  const keep = e.decision === 'keep' && !!ctx
  const newText = wholeIntroText(lang, lego.known_text, keep ? ctx : null)
  const free = (recipe, donor) => ({ ...base, recipe, donor: donor || null, newText, ttsText: null, ttsChars: 0, avoidedChars: newText.length })
  if (keep) {
    const d = e.ctx[norm(ctx)]
    if (d) return free('splice', d)
    if (cur && cur.ctx && norm(cur.ctx) === norm(ctx)) return free('keep-own', { id: lego.currentAudioId || null, course: 'own' })
    const t = secondHalfText(lego.known_text, ctx)
    return { ...base, recipe: 'tts', newText, ttsText: t, ttsChars: t.length, avoidedChars: 0 }
  }
  if (e.bare) return free('splice', e.bare)
  if (cur && cur.ctx) return free('edit-own', { id: lego.currentAudioId || null, course: 'own' })
  const t = secondHalfText(lego.known_text, null)
  return { ...base, recipe: 'tts', newText, ttsText: t, ttsChars: t.length, avoidedChars: 0 }
}

/** Roll a course's plans into the match report. */
function summarise(plans, { lang, frameInLibrary }) {
  const r = { intros: plans.length, matched: 0, keep: 0, strip: 0, unmatched: 0, conflicts: 0, recipes: {}, ttsChars: 0, avoidedChars: 0, ttsNeeded: [] }
  for (const p of plans) {
    r.recipes[p.recipe] = (r.recipes[p.recipe] || 0) + 1
    if (p.match) { r.matched++; r[p.match]++ } else r.unmatched++
    if (p.conflict) r.conflicts++
    r.ttsChars += p.ttsChars; r.avoidedChars += p.avoidedChars
    if (p.recipe === 'tts') r.ttsNeeded.push({ lego_id: p.lego_id, x: p.x, text: p.ttsText })
  }
  const frame = `The ${lang} for`
  r.frame = { text: frame, inLibrary: !!frameInLibrary, chars: frameInLibrary ? 0 : frame.length }
  r.ttsChars += r.frame.chars
  r.matchRate = r.intros ? r.matched / r.intros : 0
  return r
}

module.exports = { T6, BREAK, norm, buildStore, parseIntro, planIntro, summarise, wholeIntroText, secondHalfText }
