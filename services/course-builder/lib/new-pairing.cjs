/**
 * A NEW PAIRING OF TAUGHT WELSH gets a few practice phrases, and no introduction
 * (Aran, 2026-10-13, Welsh sandboxes cym_nv2_for_eng / cym_sv2_for_eng).
 *
 *   "N1092 'for a while / am dipyn' needs no intro item, but a few phrases using it should
 *    crop up. We're just giving the builder a little extra flexibility."
 *
 * The case: a LEGO is ALREADY TAUGHT because its Welsh (identical, or a soft-mutated form —
 * isSameWelsh, the rule v2 finalize applies) was taught earlier under DIFFERENT English. Its
 * Welsh is old, so it gets no introduction (is_new false). But the English↔Welsh pairing is new,
 * so the learner should say it 2-3 times, in longer sentences.
 *
 * WHERE THOSE PHRASES LIVE (canon P25, Kai 2026-09-28): the player builds rounds only for is_new
 * LEGOs, so a phrase filed under the not-new LEGO itself is never heard. They are filed under a
 * NEW LEGO of the same seed — its last new LEGO, the P26 home — and every one of them contains
 * BOTH that host LEGO and the taught pairing (its new English, its old Welsh). A seed with no
 * other new LEGO has no host: the LEGO is HELD and listed, never given an invented home.
 *
 * NOT CHANGED: a LEGO already taught under the SAME English as well (an ordinary duplicate) is
 * no new pairing — it gets nothing, exactly as before. Non-Welsh courses: isSameWelsh is false,
 * so nothing here ever fires for them.
 *
 * Pure functions; the generator (phrase-generation.cjs generatePairingPhrases) and the sandbox
 * driver (tools/course-optimization/weave-cym-new-pairing-phrases.cjs) do the I/O.
 * Test: services/course-builder/lib/new-pairing.test.cjs
 */
const { isSameWelsh, isWelshTarget, welshExpandYn } = require('./welsh-mutation.cjs');

/** Aran: "a few (2-3)". Three is asked for; two is accepted. */
const NEW_PAIRING_PHRASES = { min: 2, max: 3 };

/** Known (English) text compared as words: case, curly quotes and punctuation ignored. */
function knownWords(s) {
  return String(s || '').toLowerCase().replace(/[’‘`´]/g, "'")
    .split(/\s+/).map((w) => w.replace(/^[^\p{L}\p{N}']+|[^\p{L}\p{N}']+$/gu, '')).filter(Boolean);
}
const sameKnown = (a, b) => knownWords(a).join(' ') === knownWords(b).join(' ');

/**
 * Is `lego` a new pairing of taught Welsh? `earlier` is every LEGO that plays BEFORE it in the
 * course running order (the caller orders them). Returns null, or
 * { taughtAs } — the first earlier LEGO with the same Welsh under other English.
 * Null when any earlier same-Welsh LEGO already carried this English (an ordinary duplicate).
 */
function newPairingOf(courseCode, lego, earlier) {
  if (!isWelshTarget(courseCode) || !lego) return null;
  const same = (earlier || []).filter((e) => isSameWelsh(courseCode, e.target_text, lego.target_text));
  if (!same.length) return null;
  if (same.some((e) => sameKnown(e.known_text, lego.known_text))) return null;
  return { taughtAs: same[0] };
}

/**
 * The NEW LEGO of the same seed that carries the phrases: the seed's last new LEGO other than
 * the taught one (P26's home). Null when the seed has none — then the LEGO is held.
 */
function hostFor(seedLegos, taughtIndex) {
  const hosts = (seedLegos || []).filter((l) => l.is_new && l.lego_index !== taughtIndex)
    .sort((a, b) => a.lego_index - b.lego_index);
  return hosts.length ? hosts[hosts.length - 1] : null;
}

/** Does `phraseTarget` contain `legoTarget` as a run of words, each equal up to a soft mutation? */
function containsWelsh(courseCode, legoTarget, phraseTarget) {
  // Both sides expanded, so "di’n barod" carries "yn barod" (Aran, 2026-10-14; welshExpandYn).
  const p = welshExpandYn(phraseTarget).split(/\s+/).filter(Boolean);
  const n = welshExpandYn(legoTarget).split(/\s+/).filter(Boolean).length;
  for (let i = 0; i + n <= p.length; i++) {
    if (isSameWelsh(courseCode, p.slice(i, i + n).join(' '), legoTarget)) return true;
  }
  return false;
}

/** Does `phraseKnown` say the LEGO's English, as a run of words? */
function containsKnown(legoKnown, phraseKnown) {
  const l = knownWords(legoKnown).join(' ');
  const p = knownWords(phraseKnown);
  const n = knownWords(legoKnown).length;
  for (let i = 0; i + n <= p.length; i++) if (p.slice(i, i + n).join(' ') === l) return true;
  return false;
}

/**
 * The pairing's own checks over a generated set. The real gates run beside these under the host
 * LEGO, and its containment gate is what proves the host is in every phrase. Returns { pass, reasons[] } — reasons are written to be fed back to the model.
 */
function checkPairingSet(courseCode, taught, use, existing = []) {
  const reasons = [];
  const rows = use || [];
  if (rows.length < NEW_PAIRING_PHRASES.min || rows.length > NEW_PAIRING_PHRASES.max) {
    reasons.push(`count: ${rows.length} phrases — write ${NEW_PAIRING_PHRASES.max} (at least ${NEW_PAIRING_PHRASES.min})`);
  }
  const seen = new Set((existing || []).map((r) => knownWords(r.target_text || r.target).join(' ')));
  for (const p of rows) {
    if (!containsWelsh(courseCode, taught.target_text, p.target)) reasons.push(`pairing: "${p.target}" does not contain "${taught.target_text}"`);
    if (!containsKnown(taught.known_text, p.known)) reasons.push(`pairing: "${p.known}" does not say "${taught.known_text}" — the new English is the point`);
    const key = knownWords(p.target).join(' ');
    if (seen.has(key)) reasons.push(`repeat: "${p.target}" is already in the basket`);
    seen.add(key);
  }
  return { pass: reasons.length === 0, reasons };
}

module.exports = { NEW_PAIRING_PHRASES, newPairingOf, hostFor, containsWelsh, containsKnown, checkPairingSet, sameKnown };
