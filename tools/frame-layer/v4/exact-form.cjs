/**
 * EXACT-FORM VOCABULARY (Tom, 2026-10-09, r-2026-10-09-phrase-vocabulary-is-checked-at-the):
 * "A conjugation of a verb is only permissible as vocabulary if that specific
 * conjugation has appeared before. Eg we hoped. Not allowed if only 'to hope'
 * has been introduced previously."
 *
 * So a candidate's target side is checked at the SURFACE FORM, never the lemma:
 *   1. every word token must occur, spelt exactly so (case folded, nothing
 *      else folded: no stemming, no lemma, no accent stripping), inside some
 *      permitted chunk (a LEGO or component target the learner has already
 *      been taught), and
 *   2. the whole phrase must tile from WHOLE taught chunks, so a form the
 *      learner met only inside another chunk's context (a contraction, a
 *      fused clitic) is not licensed as a free-standing word.
 * `offending` names the forms that failed step 1, which is what a reader needs
 * to see ("espérions", not "an untaught word").
 *
 * Space-delimited targets tile by word. Pass { noSpace: true } for scripts written
 * without spaces (zho, jpn, yue, tha...): chunks and target are then tiled by character,
 * still from WHOLE taught chunks.
 */
// Own normaliser, not availability.norm: that one turns combining marks (\p{M}: Devanagari,
// Bengali, Tamil vowel signs) into spaces, so a form differing only by a vowel sign
// (करता / करती, कि / की) would look identical to the taught one.
const norm = (s) => String(s || '').toLowerCase().replace(/[^\p{L}\p{M}\p{N}' ]/gu, ' ').replace(/\s+/g, ' ').trim();

/** Units a target is tiled in: words, or single characters for scripts written without spaces. */
const unitsOf = (s, noSpace) => (noSpace ? [...norm(s).replace(/\s+/g, '')] : norm(s).split(' ').filter(Boolean));

/** Tile `target` from whole chunks (the lab's tilesFromVocab walk). */
function tiles(target, vocabTargets, { noSpace = false } = {}) {
  const seen = new Map();
  for (const v of vocabTargets) { const u = unitsOf(v, noSpace); if (u.length) seen.set(u.join('\u0000'), u); }
  const chunks = [...seen.values()].sort((a, b) => b.length - a.length);
  const words = unitsOf(target, noSpace);
  const memo = new Map();
  const walk = (i) => {
    if (i >= words.length) return [];
    if (memo.has(i)) return memo.get(i);
    let res = null;
    for (const c of chunks) {
      const cw = c;
      if (cw.length > words.length - i || !cw.every((w, j) => w === words[i + j])) continue;
      const rest = walk(i + cw.length);
      if (rest) { res = [c, ...rest]; break; }
    }
    memo.set(i, res);
    return res;
  };
  const t = walk(0);
  if (t) return { ok: true, tiling: t.map(c => c.join(noSpace ? '' : ' ')) };
  const owned = new Set(chunks.flat());
  return { ok: false, untiled: [...new Set(words.filter(w => !owned.has(w)))] };
}

/** @returns {{ok:boolean, offending:string[], reason:string|null, tiling?:string[]}} */
function exactFormCheck(target, vocabTargets, opts) {
  const t = tiles(target, vocabTargets, opts);
  if (t.ok) return { ok: true, offending: [], reason: null, tiling: t.tiling };
  const offending = t.untiled;
  return {
    ok: false,
    offending,
    reason: offending.length
      ? `form never taught as this exact word: ${offending.join(' ')}`
      : 'target does not tile from WHOLE taught chunks (a form or contraction never taught as a unit)',
  };
}

module.exports = { exactFormCheck, tiles };
