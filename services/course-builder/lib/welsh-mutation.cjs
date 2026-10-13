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


/**
 * WHAT A WELSH PRACTICE PHRASE MAY USE (Aran, 2026-10-13, job #504): "any Welsh taught earlier
 * in the course" — every word of every LEGO, component and seed sentence before this point in the
 * running order, plus the current LEGO — and a soft-mutated form is the same taught word
 * (cael/gael, calon/galon), as is a final f dropped to an apostrophe (cyfrif/cyfri’, Aran's
 * ruling on that word). The builder's general gate instead TILES a phrase from whole LEGO /
 * component / seed chunks, so a word met only inside a bigger chunk ("trio" inside "dw i’n trio",
 * old seeds 1-137 have no components at all) read as untaught. For Welsh, this word-level reading
 * is the rule; checkVocabViolations falls back to it when tiling fails. Since 2026-10-13 (Aran,
 * confirmed by Tom, job #587) the same word-level reading applies to EVERY language through
 * taught-words.cjs, which calls this code for Welsh; only the soft-mutation folding is Welsh's own.
 *
 * A token is split at a clitic apostrophe: "nhw’n" → "nhw" + "’n", "mae’r" → "mae" + "’r";
 * a trailing apostrophe ("cyfri’", "be’") stays on its word.
 */
function welshPieces(text) {
  const out = [];
  const toks = String(text || '').toLowerCase().replace(/[’‘`´]/g, "'").replace(/[.,!?;:¿¡«»"“”()]/g, ' ')
    .split(/\s+/).filter(Boolean);
  for (const t of toks) {
    const m = t.match(/^([^']+)('[^']+)$/);
    if (m) out.push(m[1], m[2]); else out.push(t);
  }
  return out.map(w => w.replace(/^'+(?=\p{L}{2})/u, '')).filter(w => w && w !== "'");
}

// The clitic forms that ARE a full word: "’n" is "yn", "’r" is "yr". Used for containment only.
// "y" is the same article as "yr" / "’r" (Aran's proofing, job #554: a LEGO introduced as
// "y peth glas ’na" is practised as "hoffi’r peth glas ’na").
const CLITIC_FULL = new Map([["'n", 'yn'], ["'r", 'yr'], ['y', 'yr']]);

/** Every spelling this piece is the same taught word as: soft radicals, and final f ↔ apostrophe. */
function pieceKeys(w) {
  const keys = new Set();
  const forms = [w];
  if (/\p{L}'$/u.test(w)) forms.push(w.slice(0, -1) + 'f');
  for (const f of forms) for (const r of softRadicals(f)) keys.add(r);
  return keys;
}

/** The set of taught keys from every text of a vocabulary (LEGO, component and seed targets). */
function welshTaughtKeys(texts) {
  const keys = new Set();
  for (const t of texts) for (const p of welshPieces(t)) for (const k of pieceKeys(p)) keys.add(k);
  return keys;
}

/** The phrase's words NOT taught by `taughtKeys` (welshTaughtKeys), in order; [] when all taught. */
function welshUntaughtWords(phraseTarget, taughtKeys) {
  return welshPieces(phraseTarget).filter(p => ![...pieceKeys(p)].some(k => taughtKeys.has(k)));
}

/**
 * The phrase carries the LEGO's words, contiguous and in order, each equal up to a soft mutation,
 * a final-f elision, or a clitic ("’n" = "yn"): "calon mor garedig" carries "galon mor garedig",
 * "ti’n cyfrif" carries "yn cyfri’". Welsh only; only ever ADDS to the exact containment check.
 */
function welshContainsLego(courseCode, legoTarget, phraseTarget) {
  if (!isWelshTarget(courseCode)) return false;
  const full = (p) => CLITIC_FULL.get(p) || p;
  const lego = welshPieces(legoTarget).map(full);
  const phrase = welshPieces(phraseTarget).map(full);
  if (!lego.length) return false;
  const same = (a, b) => { const ka = pieceKeys(a); return [...pieceKeys(b)].some(k => ka.has(k)); };
  for (let i = 0; i + lego.length <= phrase.length; i++) {
    if (lego.every((w, j) => same(w, phrase[i + j]))) return true;
  }
  return false;
}

module.exports = { isSoftMutationVariant, isSameWelsh, softEquivalentWords, softRadicals, isWelshTarget,
  welshPieces, welshTaughtKeys, welshUntaughtWords, welshContainsLego };
