/**
 * A-119 — did a re-rendered clip stop speaking the slash form?
 *
 * The isl/ell/est pass (tools/a108/changed-form-check.cjs) asked "did the clip
 * say the CORRECTED word instead of the superseded one?" — a SUBSTITUTION test.
 * That is the wrong instrument on most of this pocket, because a slash fix is
 * usually a pure REMOVAL: `Pan/Pani` -> `Pan` adds no word at all, it deletes
 * one. tokenDiff(after, before) is empty on 26 of the 38 clips here, so the
 * substitution test would pass vacuously on exactly the clips that matter most.
 *
 * So this file adds the missing half — an ABSENCE test — and the render runs
 * both:
 *
 *   substitution (when the edit adds a word, e.g. `pronto/a` -> `pronta`)
 *     -> reuse speaksCorrectedForm() from changed-form-check.cjs
 *
 *   absence (always) -> no word in the decode may sit STRICTLY closer to a
 *     deleted form than to every retained word of the sentence.
 *
 * Why "strictly closer to the deleted form than to anything retained" and not
 * plain string search: `pan` and `pani` are one edit apart, and whisper's
 * Polish decode of the corrected line legitimately contains `pan`. A substring
 * test for "pani" would false-fail on `pana`, `panu`, and on `pan` inside a
 * longer decode token. The comparison is what is robust: transliteration noise
 * pushes a decode word away from BOTH candidates equally, so it cancels, and
 * only a word that genuinely sounds like the deleted form beats every retained
 * word.
 *
 * Short deleted tokens are ADVISORY, never gating. A one- or two-letter residue
 * (`(-a)` -> `a`, `-lo/a` -> `a`, `(-ai)` -> `ai`) is inside whisper's noise
 * floor and is a real word in Portuguese and Latvian besides; gating on it
 * would reject healthy clips for reasons that have nothing to do with the fix.
 * Those clips are still gated by CER-vs-corrected < CER-vs-superseded and by
 * the not-truncated duration check, which a clip that still spoke both forms
 * cannot pass.
 */

const { tokenDiff } = require('./changed-form-check.cjs')

/** Minimum length for a deleted token to GATE rather than merely advise. */
const GATING_MIN_LEN = 3

function lev (a, b) {
  const m = a.length, n = b.length
  if (!m) return n
  if (!n) return m
  let prev = Array.from({ length: n + 1 }, (_, j) => j)
  for (let i = 1; i <= m; i++) {
    const cur = [i]
    for (let j = 1; j <= n; j++) {
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1))
    }
    prev = cur
  }
  return prev[n]
}

const wordsOf = s => String(s).toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, ' ').split(/\s+/).filter(Boolean)

/**
 * @param {string} decodeNorm  normalised whisper decode of the NEW clip
 * @param {string} before      the superseded text (what the old bytes said)
 * @param {string} after       the corrected text (what the new bytes must say)
 * @param {(s:string)=>string} norm  the veracity normaliser
 * @returns {{ok:boolean, results:Array, advisory:Array}}
 */
function droppedSlashForm (decodeNorm, before, after, norm) {
  const deleted = tokenDiff(before, after).map(norm).filter(Boolean)
  const retained = wordsOf(after).map(norm).filter(Boolean)
  const heard = decodeNorm.split(/\s+/).filter(Boolean)

  // PLAIN Levenshtein here, deliberately. Merge-tolerance is only sound when
  // both sides of a comparison get it; the deleted form and the retained words
  // are DIFFERENT candidate sets, so tolerating merges on the retained side
  // would let a decode word be excused by a word it merely begins with —
  // `pani` would be "explained" by the retained `pan` and a clip still saying
  // both forms would pass. Merge-tolerance lives in twinMultiplicity and
  // speaksFusedForm, where every candidate is scored the same way.
  const distToRetained = w => retained.reduce((m, r) => Math.min(m, lev(w, r)), Infinity)

  const judge = tok => {
    // The decode word that most sounds like the deleted form.
    let worst = null, worstD = Infinity
    for (const w of heard) {
      const d = lev(w, tok)
      if (d < worstD) { worstD = d; worst = w }
    }
    const dRetained = worst === null ? Infinity : distToRetained(worst)
    // A deleted form that is a SUBSTRING of a word the corrected sentence still
    // contains is structurally undecidable by distance: `عايز` inside `عايزة`,
    // `pan` inside `pani`. Every faithful rendering of the retained word sits
    // within (retained.length - deleted.length) edits of the deleted one, so
    // "closer to the deleted form" carries no information about what was said.
    // Distance cannot decide it — but MULTIPLICITY can, and does (see
    // twinMultiplicity). That is what gates the swallowed case instead.
    const swallowed = retained.find(r => r !== tok && r.includes(tok)) || null
    return {
      deleted_token: tok,
      closest_decode_word: worst,
      distance_to_deleted: worstD === Infinity ? null : worstD,
      distance_to_nearest_retained: dRetained === Infinity ? null : dRetained,
      swallowed_by_retained: swallowed,
      // Still spoken iff some word is strictly closer to the deleted form than
      // to anything the corrected sentence legitimately contains.
      still_spoken: worst !== null && worstD < dRetained,
    }
  }

  const judged = deleted.map(judge)
  // Gating requires a token long enough to survive whisper's noise floor AND
  // not swallowed by a retained word. Everything else is advisory: those clips
  // are still gated by CER-vs-superseded, by shorter_than_superseded (a clip
  // that still spoke both gendered forms cannot be shorter than the one that
  // did), and by the fused-form check where the edit introduced a new word.
  const gates = r => r.deleted_token.length >= GATING_MIN_LEN && !r.swallowed_by_retained
  const gating = judged.filter(gates)
  const advisory = judged.filter(r => !gates(r))

  // The swallowed cases are not left ungated: they are handed to the
  // multiplicity test, which IS decidable when one form contains the other.
  const twins = [...new Set(judged.map(r => r.swallowed_by_retained).filter(Boolean))]
  const multiplicity = twins.map(twin => twinMultiplicity(twin, retained, heard))

  return {
    ok: gating.every(r => !r.still_spoken) && multiplicity.every(m => m.ok),
    results: gating, advisory, multiplicity,
  }
}

/**
 * How many times does the decode say the surviving twin?
 *
 * When the deleted form is contained in a retained one (`pan` in `pani`,
 * `عايز` in `عايزة`), no distance test can tell "Pani" from "Pan Pani" — but
 * COUNTING can. The broken clip says the twin-ish sound TWICE (once for each
 * gendered form, which are by construction near-identical); the corrected clip
 * says it as many times as the corrected text actually contains it.
 *
 * A decode word counts towards the twin only if it is nearer to the twin than
 * to any OTHER retained word, so unrelated vocabulary cannot inflate the count.
 * The radius scales with the twin's length rather than being a fixed constant,
 * because one edit means something different in a 4-letter word and a 12-letter
 * one.
 */
function twinMultiplicity (twin, retained, heard) {
  const radius = Math.max(1, Math.floor(twin.length / 3))
  const others = retained.filter(r => r !== twin)
  const expected = retained.filter(r => r === twin).length
  const matched = heard.filter(w => {
    const d = distTolerantOfMerges(w, twin)
    if (d > radius) return false
    return others.every(o => distTolerantOfMerges(w, o) > d)
  })
  return {
    twin, radius, expected_in_corrected_text: expected,
    heard_count: matched.length, matched_decode_words: matched,
    // Fewer than expected is whisper dropping a word — noisy, not evidence of
    // the slash form surviving. MORE than expected is the failure this catches.
    ok: matched.length <= expected,
  }
}

/**
 * Levenshtein, tolerant of whisper running two words together.
 *
 * whisper merges adjacent words freely — Latvian `gatava sākt` came back as the
 * single token `gatavasak`, which is 3 edits from `gatava` AND 3 from the
 * superseded `gatavs`, so a strictly-closer test cannot separate them and a
 * healthy clip fails for a reason that has nothing to do with the words spoken.
 *
 * So a decode word is also scored against `candidate` after being cut to the
 * candidate's own length, from each end. The cut is driven by the CANDIDATE's
 * length, so every candidate is treated identically and the comparison stays
 * unbiased: `gatavasak` scores 0 against `gatava` and 1 against `gatavs`, which
 * is the true reading.
 */
function distTolerantOfMerges (word, candidate) {
  const whole = lev(word, candidate)
  if (word.length <= candidate.length) return whole
  const n = candidate.length
  return Math.min(whole, lev(word.slice(0, n), candidate), lev(word.slice(-n), candidate))
}

/**
 * Did the clip say the FUSED corrected form rather than the superseded one?
 *
 * The A-119 sibling of speaksCorrectedForm() in changed-form-check.cjs, which
 * this pass cannot use unmodified: that function scores decode words with plain
 * Levenshtein, and Latvian `gatava sākt` came back from whisper as the single
 * merged token `gatavasak` — 3 edits from the corrected `gatava` and 3 from the
 * superseded `gatavs`, so "strictly closer to the corrected form" could not
 * separate them and a healthy clip failed. Scoring merge-tolerantly (and
 * identically for both candidates) reads it correctly: 0 vs 1.
 *
 * changed-form-check.cjs is left untouched so the isl/ell/est pass and its
 * independent verifier keep the exact semantics they shipped with.
 */
function speaksFusedForm (decodeNorm, newTokens, oldTokens, norm, unchangedTokens) {
  const unchanged = (unchangedTokens || []).map(norm)
  const heard = decodeNorm.split(/\s+/).filter(Boolean)
  const distToUnchanged = w => unchanged.reduce((m, u) => Math.min(m, distTolerantOfMerges(w, u)), Infinity)

  const pairs = newTokens.map(t => {
    const nt = norm(t)
    let ot = null, bd = Infinity
    for (const o of oldTokens) { const d = lev(nt, norm(o)); if (d < bd) { bd = d; ot = norm(o) } }
    return { newTok: nt, oldTok: ot }
  })

  const results = pairs.map(p => {
    let best = null, bestScore = Infinity
    for (const w of heard) {
      const score = p.oldTok === null
        ? distTolerantOfMerges(w, p.newTok)
        : Math.min(distTolerantOfMerges(w, p.newTok), distTolerantOfMerges(w, p.oldTok))
      // A decode word the sentence already contained elsewhere says nothing
      // about the slot that changed.
      if (distToUnchanged(w) < score) continue
      if (score < bestScore) { bestScore = score; best = w }
    }
    const dNew = best === null ? Infinity : distTolerantOfMerges(best, p.newTok)
    const dOld = best === null || p.oldTok === null ? Infinity : distTolerantOfMerges(best, p.oldTok)
    return {
      heard: best, newTok: p.newTok, oldTok: p.oldTok,
      distance_to_new: dNew === Infinity ? null : dNew,
      distance_to_superseded: dOld === Infinity ? null : dOld,
      ok: best !== null && (p.oldTok === null ? dNew <= 2 : dNew < dOld),
    }
  })

  return { ok: results.every(r => r.ok), results }
}

module.exports = { droppedSlashForm, speaksFusedForm, twinMultiplicity, distTolerantOfMerges, GATING_MIN_LEN, lev }
