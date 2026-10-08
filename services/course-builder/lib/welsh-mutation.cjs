/**
 * Welsh SOFT MUTATION as "already taught" (Aran, 2026-10-07 17:25Z):
 *   "Cymraeg taught means Gymraeg is not new; same for medra/fedra" — as the Welsh course
 *   always has. A LEGO whose target differs from an earlier LEGO of the SAME known text only by
 *   a soft mutation on one or more words is the same LEGO: a duplicate (is_new false), not a
 *   ZUT fork. Kai's target-side bound (canon K8, 2026-08-28): "a mild softening mutation ... is
 *   acceptable because it's barely perceptible to a learner, but nothing more than that."
 *
 * ONLY the soft mutation (and the mi/fe particle that causes it — see PREVERBAL). Nasal (c→ngh,
 * t→nh, p→mh, b→m, d→n, g→ng) and aspirate (c→ch, t→th, p→ph, h- before a vowel) are NOT folded here: nobody has ruled them already-taught, and Kai
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

// The affirmative preverbal particles. "mi fedra i" IS "medra i": the particle is what causes
// the soft mutation, and North Welsh drops it freely (Aran's own example, medra/fedra:
// "I can" was taught at seed 26 as "mi fedra i"). Dropped only from the FRONT of a target, and
// only when the other target lacks it, so "i mi" (to me) is never touched.
const PREVERBAL = new Set(['mi', 'fe']);

/**
 * True when two DIFFERENT target texts are the same words in the same order, each word equal or
 * a soft-mutation variant of its partner. False for non-Welsh courses and for identical texts
 * (identical is the caller's ordinary duplicate).
 */
function isSoftMutationVariant(courseCode, targetA, targetB) {
  if (!isWelshTarget(courseCode)) return false;
  let ta = String(targetA || '').split(/\s+/).map(normWord).filter(Boolean);
  let tb = String(targetB || '').split(/\s+/).map(normWord).filter(Boolean);
  // Identical texts are the caller's ordinary duplicate — judged BEFORE the particle is stripped,
  // so that "mi fedra i" vs "fedra i" (particle the only difference) still folds.
  if (ta.join(' ') === tb.join(' ')) return false;
  if (ta.length === tb.length + 1 && PREVERBAL.has(ta[0])) ta = ta.slice(1);
  else if (tb.length === ta.length + 1 && PREVERBAL.has(tb[0])) tb = tb.slice(1);
  if (ta.length === 0 || ta.length !== tb.length) return false;
  return ta.every((w, i) => w === tb[i] || softEquivalentWords(w, tb[i]));
}

/**
 * SAME WELSH = ALREADY TAUGHT, WHATEVER THE ENGLISH SAYS (Aran, 2026-10-08 11:59Z, job #429):
 * "LEGOs with the same Welsh (identical, or a soft-mutated form) as one taught earlier in the
 * running order count as ALREADY TAUGHT, even when the English label differs" — e.g. "to get up"
 * = codi after "to raise" = codi; "we'd like" = bydden ni'n licio after "we would like".
 *
 * KNOWN HAZARD, kept because the ruling names soft mutation explicitly: across DIFFERENT English
 * the soft fold can join two different words — "awn ni?" (shall we go) reads as the soft form of
 * "cawn ni" (could we have), and a homograph like nôl (fetch / back) is "identical". With the
 * same English (the 2026-10-07 rule) that cannot happen; here it can. Reported to Aran with the
 * cases found in cym_nv2/cym_sv2, not filtered silently.
 *
 * False for every non-Welsh course, so the caller behaves exactly as before there.
 */
function isSameWelsh(courseCode, targetA, targetB) {
  if (!isWelshTarget(courseCode)) return false;
  const a = String(targetA || '').split(/\s+/).map(normWord).filter(Boolean).join(' ');
  const b = String(targetB || '').split(/\s+/).map(normWord).filter(Boolean).join(' ');
  if (!a || !b) return false;
  return a === b || isSoftMutationVariant(courseCode, targetA, targetB);
}

module.exports = { isSoftMutationVariant, isSameWelsh, softEquivalentWords, softRadicals, isWelshTarget };
