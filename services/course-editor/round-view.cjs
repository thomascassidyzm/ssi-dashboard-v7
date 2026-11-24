/**
 * Fine-tuning editor — WHAT A LEARNER HEARS IN EACH ROUND, pure (job #128·AL, Aran 2026-11-24).
 *
 * Aran's editor shows a round the way the learner app plays it, so that a drag or an edit is judged against what is
 * actually heard. The shape is the learner app's /cycles endpoint (ssi-learning-app api/courses/[code]/cycles.ts,
 * buildLegoCycles), mirrored here rule for rule:
 *
 *   intro -> debut -> PRACTICE (BUILD phrases, then USE phrases, up to 7) -> REVISITS (≤12) -> ROUND-OFF (2 USE)
 *
 *   - PRACTICE pools are sorted SHORTEST FIRST by target syllables (stable: ties keep DB position order) — UNLESS the
 *     round's order was set by hand (course_legos.phrase_order_hand_at): then, WITHIN the builds and WITHIN the uses, the
 *     phrases Aran placed (hand_order) come first, in his order, and anything unplaced follows in the usual order. The hand order covers PRACTICE ONLY
 *     (Aran's default, 2026-11-24): round-off and revisits keep shortest-first, so no other round's revisits move.
 *   - A phrase whose known+target words repeat one already played this round (the debut included) is skipped ("claim").
 *   - REVISITS: the round 1 back gives three USE phrases, the rounds 2, 3, 5, 8, 13, 21, 34, 55 back one each, drawn from
 *     that round's shortest-first USE pool (phrases with all three clips only) at the closed-form cursor cycles.ts uses.
 *     Rungs 89 and 144 play the whole SEED sentence, not a phrase: listed as `seedRevisits`, not as phrase rows.
 *   - ROUND-OFF: the next two USE phrases not yet played; if fewer remain, a repeat of any USE phrase that is not the debut.
 *
 * KNOWN DIFFERENCE, stated rather than hidden: the in-app walk (generateLearningScript) applies the course's Easy-mode
 * length cap and known-side pull filter, which /cycles does not. They change WHICH revisit is drawn, never the shape.
 */
'use strict'

const SPACED_REP_OFFSETS = [1, 2, 3, 5, 8, 13, 21, 34, 55, 89, 144]
const SEED_REVIEW_START_OFFSET = 89
const N1_PHRASE_COUNT = 3
const MAX_SPACED_REP_PHRASES = 12
const MAX_BUILD_PHRASES = 7
const USE_CONSOLIDATION_COUNT = 2

/** @ssi/core countTargetSyllables, verbatim: CJK/Kana/Hangul one each, else Latin vowel clusters, floor 1. */
function countTargetSyllables(t) {
  if (!t) return 0
  const cjk = t.match(/[一-鿿㐀-䶿぀-ゟ゠-ヿ가-힯]/g)
  if (cjk && cjk.length) return cjk.length
  const v = t.toLowerCase().match(/[aeiouyáéíóúàèìòùâêîôûäëïöü]+/gi)
  return v ? v.length : 1
}
const normalizeForKey = (s) => (s ? s.toLowerCase().trim().replace(/[.,!?;:¡¿'"　-〿＀-／：-＠［-｀｛-･]+/g, '') : '')
/** cycles.ts pickTargets: the player shows (and keys on) the romanisation when there is one. */
const shownTarget = (r) => (r.target_text_roman && r.target_text_roman.trim() ? r.target_text_roman : r.target_text || '')
const keyOf = (r) => `${normalizeForKey(r.known_text)}|${normalizeForKey(shownTarget(r))}`
const shortestFirst = (list) => list.map((p, i) => ({ p, i, s: countTargetSyllables(p.target_text) }))
  .sort((a, b) => a.s - b.s || a.i - b.i).map((x) => x.p)
const fullAudio = (p) => !!(p.known_audio_id && p.target1_audio_id && p.target2_audio_id)
/** A hand-set round's pool: the phrases Aran placed (hand_order), in his order, then the rest in their usual order. */
const byHand = (list) => [...list.filter((p) => p.hand_order != null).sort((a, b) => a.hand_order - b.hand_order),
  ...list.filter((p) => p.hand_order == null)]
const reviewCursor = (k, n) => (k <= 0 || n <= 0 ? 0 : Math.min(N1_PHRASE_COUNT, n) + (k - 1))

/**
 * @param roundMap  [{ round_index, lego_id }] — course_round_index, in order
 * @param legoById  Map lego_id -> course_legos row (seed_number, lego_index, known_text, target_text, target_text_roman,
 *                  phrase_order_hand_at?)
 * @param phrasesByKey Map "seed:lego_index" -> that LEGO's build/use rows in DB position order
 * @returns [{ n, legoId, handOrder, practice: [id], revisits: [{ id, from }], seedRevisits: [{ seed, from }],
 *            roundOff: [id], unplayed: [id] }]
 */
function buildRounds(roundMap, legoById, phrasesByKey) {
  const sortedUses = new Map()   // legoId -> shortest-first USE pool
  const legoAt = new Map()       // round number -> lego row
  for (const r of roundMap) legoAt.set(r.round_index, legoById.get(r.lego_id))
  const keyOfLego = (l) => `${l.seed_number}:${l.lego_index}`
  const usesOf = (l) => {
    if (!sortedUses.has(l.lego_id)) sortedUses.set(l.lego_id, shortestFirst((phrasesByKey.get(keyOfLego(l)) || []).filter((p) => p.phrase_role === 'use')))
    return sortedUses.get(l.lego_id)
  }

  const out = []
  for (const r of roundMap) {
    const lego = legoById.get(r.lego_id)
    if (!lego) continue
    const rows = phrasesByKey.get(keyOfLego(lego)) || []
    const builds = shortestFirst(rows.filter((p) => p.phrase_role === 'build' || p.phrase_role === 'practice'))
    const uses = usesOf(lego)
    const claimed = new Set([keyOf(lego)])
    const claim = (p) => { const k = keyOf(p); if (claimed.has(k)) return false; claimed.add(k); return true }
    const handOrder = !!lego.phrase_order_hand_at
    // BUILD stays before USE whatever the hand order says (Tom's Watson's impact check #129·AL, verified 2026-11-24):
    // Aran's order is applied WITHIN the builds and WITHIN the uses, never across. USE membership and the revisit pools
    // (usesOf, shortest-first) are untouched, so no other round's revisits move.
    const seq = handOrder ? [...byHand(builds), ...byHand(uses)] : [...builds, ...uses]
    const practice = []
    for (const p of seq) { if (practice.length >= MAX_BUILD_PHRASES) break; if (claim(p)) practice.push(p.id) }

    const revisits = [], seedRevisits = []
    let rep = 0
    for (let k = 0; k < SPACED_REP_OFFSETS.length; k++) {
      const from = r.round_index - SPACED_REP_OFFSETS[k]
      if (from < 1) break
      const old = legoAt.get(from)
      if (!old) continue
      if (SPACED_REP_OFFSETS[k] >= SEED_REVIEW_START_OFFSET) { seedRevisits.push({ seed: old.seed_number, from }); continue }
      if (rep >= MAX_SPACED_REP_PHRASES) break
      const pool = usesOf(old).filter(fullAudio)
      if (!pool.length) continue
      const take = Math.min(k === 0 ? N1_PHRASE_COUNT : 1, MAX_SPACED_REP_PHRASES - rep, pool.length)
      let cur = reviewCursor(k, pool.length)
      for (let i = 0; i < take; i++) {
        const p = pool[cur % pool.length]; cur++
        if (!claim(p)) continue
        rep++
        revisits.push({ id: p.id, from })
      }
    }

    const roundOff = []
    for (const p of uses) { if (roundOff.length >= USE_CONSOLIDATION_COUNT) break; if (claim(p)) roundOff.push(p.id) }
    if (roundOff.length < USE_CONSOLIDATION_COUNT) {
      const debut = keyOf(lego)
      for (const p of uses) { if (roundOff.length >= USE_CONSOLIDATION_COUNT) break; if (keyOf(p) !== debut) roundOff.push(p.id) }
    }
    const heard = new Set([...practice, ...roundOff])
    out.push({ n: r.round_index, legoId: lego.lego_id, handOrder, practice, revisits, seedRevisits, roundOff,
      unplayed: rows.filter((p) => !heard.has(p.id)).map((p) => p.id) })
  }
  return out
}

module.exports = { buildRounds, countTargetSyllables, SPACED_REP_OFFSETS, MAX_BUILD_PHRASES }
