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

  const distToRetained = w => retained.reduce((m, r) => Math.min(m, lev(w, r)), Infinity)

  const judge = tok => {
    // The decode word that most sounds like the deleted form.
    let worst = null, worstD = Infinity
    for (const w of heard) {
      const d = lev(w, tok)
      if (d < worstD) { worstD = d; worst = w }
    }
    const dRetained = worst === null ? Infinity : distToRetained(worst)
    return {
      deleted_token: tok,
      closest_decode_word: worst,
      distance_to_deleted: worstD === Infinity ? null : worstD,
      distance_to_nearest_retained: dRetained === Infinity ? null : dRetained,
      // Still spoken iff some word is strictly closer to the deleted form than
      // to anything the corrected sentence legitimately contains.
      still_spoken: worst !== null && worstD < dRetained,
    }
  }

  const gating = deleted.filter(t => t.length >= GATING_MIN_LEN).map(judge)
  const advisory = deleted.filter(t => t.length < GATING_MIN_LEN).map(judge)

  return { ok: gating.every(r => !r.still_spoken), results: gating, advisory }
}

module.exports = { droppedSlashForm, GATING_MIN_LEN, lev }
