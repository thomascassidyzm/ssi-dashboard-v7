/**
 * THE ADMITTED LIST — the only vocabulary a practice phrase may use, on BOTH sides.
 *
 * Tom's ruling, 2026-11-05 (r-2026-11-05), verbatim:
 *   "BOTH target and English must only use words in the phrases that have been
 *    introduced already in the course / there is no need to check afterwards with
 *    Japanese / the phrases can only be built by combining the vocabulary in the list
 *    of admitted words / i.e. SEED sentences up to N-1 and LEGOS from SEED N up to L-1
 *    / i.e. phrases for LEGO S0248L03 can use ONLY Japanese SEEDS up to S0247 plus
 *    LEGOS S0248L01 and S0248L02 (or all LEGOS in the introduction order up to L-1)
 *    from S0001L01 to S0248L02"
 * and, earlier the same thread: "thank you and of course CAN be used as vocab, provided
 * they have already been admitted".
 *
 * So, for LEGO S<N>L<L>, in introduction order (seed_number, then lego_index):
 *   - every SEED sentence S0001..S<N-1>, known_text and target_text;
 *   - every LEGO S0001L01..S<N>L<L-1>;
 *   - the LEGO itself;
 *   - a COMPONENT row only as a PART of an admitted LEGO: its parent LEGO (same seed and
 *     lego_index) is admitted AND its target lies inside the parent's target AND its known
 *     lies inside the parent's known. A component is never free-standing vocabulary: its
 *     known side is a literal tiling gloss (Tom 2026-07-04) and could otherwise smuggle in
 *     a known-language word the learner never heard.
 * Nothing else. In particular there is NO known-language free class: no glue words, no
 * negation or NPI words, no dummy "do", no -s/-ed/-ing stripping. This supersedes the
 * known-side free class in ralph-methodology.md and the pair contracts for every caller
 * of this module (the v4 generator and the live v4 door).
 *
 * ONE list per LEGO, built once, feeds the prompt, the known check and the target check.
 *
 * How each side is checked against it:
 *   - a language written WITH spaces: word by word at the exact surface form, through
 *     taught-words.cjs (the same tokeniser the live builder uses; Aran/Tom 2026-10-13: a
 *     word met inside a bigger admitted chunk is admitted; any other form is new). Applied
 *     to the known language exactly as to the target: "speaks" is admitted only if some
 *     admitted known_text contains "speaks".
 *   - a language written WITHOUT spaces (language-config isChinese: zho, cmn, yue, hak, nan,
 *     jpn, tha, mya, lao, khm): whole-chunk tiling by character, through the course
 *     builder's own findUncoveredChinese — the tiler phrase-gate runs. Whole admitted
 *     chunks only: no re-splitting, no re-conjugating. Applied to a no-space KNOWN
 *     language too (eng_for_jpn's Japanese prompts).
 * Phrase-gate still runs after this as the final check; nothing here relies on it.
 *
 * Pure: rows in, verdicts out. No database, no model.
 */
'use strict';

const { isChinese } = require('../course-builder/lib/language-config.cjs');
const { findUncoveredChinese } = require('../course-builder/lib/validation.cjs');
const { normalizeForStorage } = require('../course-builder/lib/text-normalization.cjs');
const { taughtWordKeys, untaughtWords, tokensOf } = require('../course-builder/lib/taught-words.cjs');

const langOf = (code) => String(code || '').split('_')[0];
const targetLangOf = (course) => langOf(String(course).split('_for_')[0]);
const knownLangOf = (course) => langOf(String(course).split('_for_')[1]);
/** isChinese reads the TARGET of a course code; ask it about one language by making that language the target. */
const noSpaceLang = (lang) => isChinese(`${lang}_for_x`);
const targetNoSpace = (course) => noSpaceLang(targetLangOf(course));
const knownNoSpace = (course) => noSpaceLang(knownLangOf(course));

const pad = (n, w) => String(n).padStart(w, '0');
const seedId = (n) => `S${pad(n, 4)}`;
const legoId = (n, l) => `S${pad(n, 4)}L${pad(l, 2)}`;

/** Before (seed, idx) in introduction order. */
const before = (r, N, L) => +r.seed_number < N || (+r.seed_number === N && +r.lego_index < L);

/** Whole-word containment for a spaced language; substring for a no-space one. */
function partOf(piece, whole, noSpace) {
  const p = String(piece || '').toLowerCase().trim(), w = String(whole || '').toLowerCase().trim();
  if (!p || !w) return false;
  if (noSpace) return w.replace(/\s+/g, '').includes(p.replace(/\s+/g, ''));
  const pt = tokensOf(p), wt = tokensOf(w);
  if (!pt.length) return false;
  for (let i = 0; i + pt.length <= wt.length; i++) if (pt.every((t, j) => wt[i + j] === t)) return true;
  return false;
}

/**
 * The admitted list for LEGO S<seedNumber>L<legoIndex>.
 * @param {object} a
 * @param {string} a.course         e.g. jpn_for_eng
 * @param {Array}  a.seeds          course_seeds rows (seed_number, known_text, target_text)
 * @param {Array}  a.legos          course_legos rows (seed_number, lego_index, known_text, target_text)
 * @param {Array}  [a.components]   component rows (seed_number, lego_index, known_text, target_text)
 * @param {object} [a.lego]         the LEGO itself, when it is a proposal not yet in `legos`
 * @returns {{ rows: Array, knownTexts: string[], targetTexts: string[], label: string, lego: object }}
 */
function admittedList({ course, seeds = [], legos = [], components = [], seedNumber, legoIndex, lego = null }) {
  const N = +seedNumber, L = +legoIndex;
  const self = lego || legos.find(l => +l.seed_number === N && +l.lego_index === L);
  if (!self) throw new Error(`admittedList: no LEGO ${legoId(N, L)} (pass the proposed LEGO)`);
  const rows = [];
  const seen = new Set();
  const push = (r) => {
    const k = `${String(r.known_text || '').toLowerCase().trim()}\u0000${String(r.target_text || '').toLowerCase().trim()}`;
    if (!r.known_text || !r.target_text || seen.has(k)) return;
    seen.add(k); rows.push(r);
  };
  for (const s of [...seeds].filter(s => +s.seed_number < N).sort((a, b) => a.seed_number - b.seed_number)) {
    push({ kind: 'seed', id: seedId(s.seed_number), seed_number: +s.seed_number, lego_index: null, known_text: s.known_text, target_text: s.target_text });
  }
  const admittedLegos = [...legos].filter(l => before(l, N, L)).sort((a, b) => a.seed_number - b.seed_number || a.lego_index - b.lego_index);
  for (const l of admittedLegos) {
    push({ kind: 'lego', id: legoId(l.seed_number, l.lego_index), seed_number: +l.seed_number, lego_index: +l.lego_index, known_text: l.known_text, target_text: l.target_text });
  }
  push({ kind: 'this-lego', id: legoId(N, L), seed_number: N, lego_index: L, known_text: self.known_text, target_text: self.target_text });
  // Components: only as a part of an admitted LEGO (its own parent, both sides inside it).
  const parentOf = new Map([...admittedLegos, self].map(l => [`${+l.seed_number}:${+l.lego_index}`, l]));
  const tNS = targetNoSpace(course), kNS = knownNoSpace(course);
  for (const c of components) {
    const parent = parentOf.get(`${+c.seed_number}:${+c.lego_index}`);
    if (!parent) continue;
    if (!partOf(c.target_text, parent.target_text, tNS) || !partOf(c.known_text, parent.known_text, kNS)) continue;
    push({ kind: 'component', id: `${legoId(c.seed_number, c.lego_index)}#part`, seed_number: +c.seed_number, lego_index: +c.lego_index, known_text: c.known_text, target_text: c.target_text });
  }
  return { rows, knownTexts: rows.map(r => r.known_text), targetTexts: rows.map(r => r.target_text), label: admittedLabel(N, L), lego: self };
}

/** The window in words, exactly as the prompt states it. */
function admittedLabel(N, L) {
  const seedsPart = N > 1 ? `SEEDS S0001–${seedId(N - 1)}` : 'no SEEDS (this is seed 1)';
  const lastLego = L > 1 ? legoId(N, L - 1) : (N > 1 ? `the last LEGO of ${seedId(N - 1)}` : null);
  const legosPart = lastLego ? `LEGOs S0001L01–${lastLego} in introduction order` : 'no earlier LEGOs';
  return `${seedsPart} and ${legosPart}, plus this LEGO ${legoId(N, L)}`;
}

/** The prompt rule, in the same words for every caller. */
function admittedRulePrompt(N, L, knownLanguage = 'the known language', targetLanguage = 'the target language') {
  // N == null: the general form, for a prompt covering several LEGOs (each states its own cut).
  const scope = N == null
    ? 'Phrases for LEGO S<N>L<L> may use ONLY: SEEDS S0001 up to S<N-1> and LEGOs S0001L01 up to S<N>L<L-1> in introduction order, plus that LEGO itself. '
    : `Phrases for LEGO ${legoId(N, L)} may use ONLY: ${admittedLabel(N, L)}. `;
  return `ADMITTED VOCABULARY — the ONLY words you may use, on BOTH sides. ${scope}`
    + `The ${knownLanguage} side and the ${targetLanguage} side are each built only from words that appear in that list's ${knownLanguage} and ${targetLanguage} texts respectively, at exactly that form. `
    + `There is NO free class: no ordinary everyday word, no little grammatical word, no "the", "a", "very", "do", "not" and no added -s/-ed/-ing, unless that exact word already appears in an admitted ${knownLanguage} text. `
    + `A word not in the list is refused, however ordinary.`;
}

/** Known-language words (or, for a no-space script, the untiled tail) not admitted. [] when clean. */
function knownSideCheck(known, admittedKnownTexts, course) {
  const lang = knownLangOf(course);
  if (noSpaceLang(lang)) return tileNoSpace(known, admittedKnownTexts);
  const pseudo = `${lang}_for_x`; // taught-words tokenises by the course's TARGET language: make the known language the target
  return [...new Set(untaughtWords(known, taughtWordKeys(admittedKnownTexts, pseudo), pseudo))];
}

/** Target words not admitted, for every script. {ok, offending, reason}. */
function targetSideCheck(target, admittedTargetTexts, course) {
  if (targetNoSpace(course)) {
    const un = tileNoSpace(target, admittedTargetTexts);
    return un.length ? { ok: false, offending: un, reason: `untaught: ${un.join(' ')}` } : { ok: true, offending: [], reason: null };
  }
  const { exactFormCheck } = require('../../tools/frame-layer/v4/exact-form.cjs');
  return exactFormCheck(target, admittedTargetTexts, { courseCode: course });
}

/** Whole-chunk tiling by character, through phrase-gate's own tiler. Returns [untiled tail] or []. */
function tileNoSpace(text, chunks) {
  const strip = (s) => normalizeForStorage(String(s || ''), true).replace(/\s+/g, '');
  const phrase = strip(text);
  if (!phrase) return [];
  const vocab = new Set(chunks.map(strip).filter(Boolean));
  const un = findUncoveredChinese(phrase, vocab);
  return un ? [un] : [];
}

/** Both sides at once: the reasons a phrase is refused, [] when admitted. */
function admittedCheck({ known, target }, admitted, course) {
  const reasons = [];
  const badKnown = knownSideCheck(known, admitted.knownTexts, course);
  if (badKnown.length) reasons.push(`known side uses words not admitted at this LEGO: ${badKnown.join(' ')}`);
  const t = targetSideCheck(target, admitted.targetTexts, course);
  if (!t.ok) reasons.push(t.offending.length ? `target uses words not admitted at this LEGO: ${t.offending.join(' ')}` : t.reason);
  return reasons;
}

/** The list as the prompt shows it: one line per row, id first, known=target. */
function renderAdmitted(rows) {
  return rows.map(r => `${r.id}: ${r.known_text} = ${r.target_text}`).join('\n');
}

module.exports = {
  admittedList, admittedLabel, admittedRulePrompt, admittedCheck, knownSideCheck, targetSideCheck, renderAdmitted,
  targetNoSpace, knownNoSpace, noSpaceLang, legoId, seedId,
};
