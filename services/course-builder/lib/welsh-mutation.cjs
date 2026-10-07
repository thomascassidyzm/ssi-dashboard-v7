/**
 * Welsh SOFT MUTATION as "already taught" (Aran, 2026-10-07 17:25Z):
 *   "Cymraeg taught means Gymraeg is not new; same for medra/fedra" — as the Welsh course
 *   always has. A LEGO whose target differs from an earlier LEGO of the SAME known text only by
 *   a soft mutation on one or more words is the same LEGO: a duplicate (is_new false), not a
 *   ZUT fork. Kai's target-side bound (canon K8, 2026-08-28): "a mild softening mutation ... is
 *   acceptable because it's barely perceptible to a learner, but nothing more than that."
 *
 * ONLY the soft mutation. Nasal (c→ngh, t→nh, p→mh, b→m, d→n, g→ng) and aspirate (c→ch, t→th,
 * p→ph, h- before a vowel) are NOT folded here: nobody has ruled them already-taught, and Kai
 * calls c→ngh "a big jump" (2026-08-26). Such a pair stays what it always was: a ZUT fork.
 *
 * Applies only to courses whose TARGET is Welsh (course code "cym_…"); every other course gets
 * false and the caller behaves exactly as before.
 */

// soft-mutated initial -> the radical initial(s) it can come from
const SOFT_TO_RADICAL = [
  ['dd', ['d']],
  ['ll', []],          // "ll" is radical (its soft form is "l"); listed so "l" below does not match it
  ['rh', []],          // likewise radical (soft form "r")
  ['ch', []],          // aspirate/radical, never a soft form
  ['ph', []],
  ['th', []],
  ['b', ['p']],
  ['d', ['t']],
  ['g', ['c']],
  ['f', ['b', 'm']],
  ['l', ['ll']],
  ['r', ['rh']],
];

const VOWEL = /^[aeiouwyâêîôûŵŷáéíóúàèìòùäëïöü]/;

function normWord(w) {
  return String(w || '').toLowerCase().replace(/[’‘`´]/g, "'").replace(/^[^\p{L}']+|[^\p{L}']+$/gu, '');
}

/** Every radical this word could be the soft mutation of, plus the word itself. */
function softRadicals(word) {
  const w = normWord(word);
  const out = new Set([w]);
  if (!w) return out;
  if (VOWEL.test(w)) out.add('g' + w); // g- drops under soft mutation: (g)orffen, (g)wneud
  for (const [soft, radicals] of SOFT_TO_RADICAL) {
    if (w.startsWith(soft)) {
      for (const r of radicals) out.add(r + w.slice(soft.length));
      break; // longest initial wins: "dd" is never read as "d"
    }
  }
  return out;
}

/** Two words are the same word up to a soft mutation of either. */
function softEquivalentWords(a, b) {
  const ra = softRadicals(a);
  for (const r of softRadicals(b)) if (ra.has(r)) return true;
  return false;
}

function isWelshTarget(courseCode) {
  return typeof courseCode === 'string' && courseCode.startsWith('cym_');
}

/**
 * True when two DIFFERENT target texts are the same words in the same order, each word equal or
 * a soft-mutation variant of its partner. False for non-Welsh courses and for identical texts
 * (identical is the caller's ordinary duplicate).
 */
function isSoftMutationVariant(courseCode, targetA, targetB) {
  if (!isWelshTarget(courseCode)) return false;
  const ta = String(targetA || '').split(/\s+/).map(normWord).filter(Boolean);
  const tb = String(targetB || '').split(/\s+/).map(normWord).filter(Boolean);
  if (ta.length === 0 || ta.length !== tb.length) return false;
  if (ta.join(' ') === tb.join(' ')) return false;
  return ta.every((w, i) => w === tb[i] || softEquivalentWords(w, tb[i]));
}

module.exports = { isSoftMutationVariant, softEquivalentWords, softRadicals, isWelshTarget };
