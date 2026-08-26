/**
 * BUILD-phrase self-teaching gate — "does this BUILD phrase actually contain the word its LEGO
 * teaches, on the KNOWN side?"
 *
 * WHY THIS FILE EXISTS
 * --------------------
 * The target side has had this check since the beginning (`lego_containment` in
 * routes/seed-complete.cjs: every BUILD and USE phrase must contain the LEGO's target text).
 * The KNOWN side has never had it. Nothing anywhere verified the most basic property a BUILD
 * phrase has: a BUILD phrase's whole job is to INTRODUCE its LEGO, so the prompt the learner
 * reads must contain the known-side word the LEGO commits to.
 *
 * Because nothing checked, phrase writers reached for the everyday near-synonym instead:
 * deu_for_jpn S0017L03 teaches 見つけ出す (herausfinden) and all three of its BUILD phrases
 * prompted with 知る — a different Japanese word (diagnosis, 2026-08-26). The same habit was
 * then confirmed 39 times across six Japanese-prompt courses: 助ける taught / 手伝う practised,
 * 知っている taught / わかる practised, べき taught / 方がいい practised.
 *
 * WHY THIS IS NOT A SUBSTRING TEST
 * --------------------------------
 * Methodology rule K6: the known side may legitimately use a different conjugation, case,
 * contraction or gender of a taught word. 知る and 知りたい are ONE word; 知る and わかる are
 * two. A plain-containment detector cannot tell those apart — measured on the six courses it
 * raises 995 candidates for 39 real defects, a 96% cry-wolf rate, which is exactly the kind of
 * check people learn to ignore.
 *
 * SO THE RULE IS: THE INVARIANT PART MUST BE THERE, THE VARYING PART MAY VARY.
 *
 * For Japanese the invariant part is not a guess. Japanese inflection alternates OKURIGANA —
 * the trailing kana — and never touches the kanji/katakana core:
 *
 *     知る 知り 知っ 知ら 知れ 知っている   all share the core 知
 *     見つけ出す 見つけ出し 見つけ出した    all share the core 見つけ出
 *
 * so the core is recoverable by shape alone, without any stemmer and without any dictionary.
 * Every kanji/katakana run of the gloss must appear, verbatim, somewhere in the prompt.
 *
 * NO STEMMER, BY DELIBERATE CHOICE. On 2026-08-26 a Yoruba-side checker used a stemmer that
 * truncated words at diacritics, collided distinct stems, and silently passed five untaught
 * words. Nothing here truncates and nothing here folds two strings together: the cores are
 * SUBSTRINGS OF THE GLOSS ITSELF, compared by exact equality. Two distinct lexemes cannot
 * collide unless they are written with identical kanji, in which case they are not distinct
 * in the orthography the learner reads either. That property is asserted in the test file
 * (`build-teaches-word.test.cjs`, "cores never collide distinct lexemes"), not just claimed here.
 *
 * THREE-VALUED, like the known-side gate it sits beside. PASS / VIOLATION / UNCHECKED, never
 * two. UNCHECKED is not a soft pass and must never be counted as one:
 *
 *   - an all-kana gloss shorter than KANA_MIN_LEN has no recoverable invariant (する → し
 *     changes its only stem character), so it is refused, not guessed;
 *   - a prompt written in a script other than the known language's is refused — that is the
 *     separate por_for_jpn/zho_for_jpn untranslated-prompt defect, and reporting it as a
 *     word-choice violation would mis-file it;
 *   - a space-segmented known side that inflects is refused unless its pair-contract declares
 *     a stemStrip, per the standing estate rule that no regex makes a language judgment.
 *
 * The direction of error is fixed and deliberate: where the shape rule cannot decide, this
 * module goes SILENT. It would rather miss a real defect than raise a false one.
 *
 * Pure. No DB, no I/O. The caller supplies everything.
 */

const {
  REASON, REASON_TEXT, detectScript, scriptsIn, normalizeKnown,
  resolveByStemStrip, NO_SPACE_SCRIPTS, DEFAULT_MORPHOLOGY, TOKEN_SPLIT_RE,
} = require('./known-side-script.cjs');

const STATUS = { PASS: 'pass', VIOLATION: 'violation', UNCHECKED: 'unchecked' };

// Extra UNCHECKED reasons this gate can emit, on top of the shared ones in known-side-script.
const TEACH_REASON = {
  NO_GLOSS: 'no_gloss',
  EMPTY_PROMPT: 'empty_prompt',
  NO_CORES: 'no_cores',
  KANA_UNDECIDABLE: 'kana_undecidable',
  BOUND_KANA_PATTERN: 'bound_kana_pattern',
};

const TEACH_REASON_TEXT = {
  no_gloss: 'the LEGO has no known-side text, so there is no word to look for',
  empty_prompt: 'the BUILD phrase has no known-side text',
  no_cores: 'the gloss reduced to nothing once annotations and punctuation were removed',
  kana_undecidable: 'the gloss is all-kana and either too short to have an invariant part (する inflects to し) or long enough to be a construction rather than a word; whether the prompt inflects it or replaces it is a language judgment this gate must not make',
  bound_kana_pattern: 'the gloss declares itself a bound pattern with a slot marker and is written entirely in kana, so its inflection point is inside it and it has no fixed invariant to look for',
};

function reasonText(code) {
  return TEACH_REASON_TEXT[code] || REASON_TEXT[code] || code;
}

// ─── Gloss cleaning ────────────────────────────────────────────────────
//
// Glosses carry authoring annotations that are NOT the word: a parenthesised disambiguation
// （女性複数） / (formal), and the 〜/～ slot marker on bound forms (〜の時, ～冊). Both must go
// before cores are taken, or every phrase in the basket "fails" for not repeating the annotation.
const ANNOTATION_RE = /[（(][^）)]*[）)]/gu;
// An annotation whose closing bracket was lost to truncation — 「知っていました（1人称」 is a real
// gloss on spa_for_jpn. Without this the fragment survives the strip and its characters become
// REQUIRED words, so every prompt in the basket is convicted of not saying "1st person".
const UNCLOSED_ANNOTATION_RE = /[（(][^）)]*$/u;
const SLOT_MARKER_RE = /[〜~～]/gu;

// A gloss may offer the author's alternatives — 「嬉しい・満足している」, 「お願いする／頼む」,
// 「忙しい、取り込んでいる」. The LEGO teaches ONE of these; a prompt that uses either has
// taught its own word. Requiring all of them is the single largest source of false alarms
// (251 of 737 on the six Japanese-prompt courses), so alternatives are checked disjunctively.
const ALTERNATIVE_RE = /[・／\/、]/u;

function cleanGloss(gloss) {
  return (gloss || '')
    .normalize('NFC')
    .replace(ANNOTATION_RE, '')
    .replace(UNCLOSED_ANNOTATION_RE, '')
    .replace(SLOT_MARKER_RE, '');
}

/** Split a cleaned gloss into the author's alternatives. Always at least one element. */
function glossAlternatives(cleaned) {
  const parts = cleaned.split(ALTERNATIVE_RE).map((s) => s.trim()).filter(Boolean);
  return parts.length ? parts : [cleaned];
}

/** Did the raw gloss declare itself a bound pattern by carrying a slot marker? */
function isBoundPattern(gloss) {
  return SLOT_MARKER_RE.test((gloss || '').normalize('NFC'));
}

// Japanese is a pro-drop language: a prompt is under no obligation to repeat the subject the
// gloss spells out (「私が残した」 taught, 「鍵をオフィスに残しました」 prompted is the same word).
// A declared, auditable list — not a rule inferred by a regex — of cores that are never required.
const PRO_DROPPABLE = new Set(['私', '僕', '俺', '君', '彼', '彼女', '我々', '私達', '私たち', '僕達', '僕たち', '貴方']);

// ─── Japanese core extraction ──────────────────────────────────────────
//
// A "core" is a maximal run of characters that inflection cannot touch: kanji, katakana, and the
// marks that bind to them (々 iteration, ヶ, ー long vowel). Hiragana is excluded precisely
// because hiragana is where Japanese inflection happens.
const HARD_CHAR_RE = /[一-鿿㐀-䶿豈-﫿ァ-ヺーヽヾ々ヶ〇]/u;

function isHardChar(ch) {
  return HARD_CHAR_RE.test(ch);
}

/**
 * The invariant parts of a Japanese gloss.
 *
 * @returns {string[]} maximal kanji/katakana runs, longest first. Empty for an all-kana gloss.
 */
function japaneseCores(cleanedGloss) {
  const cores = [];
  let cur = '';
  for (const ch of cleanedGloss) {
    if (isHardChar(ch)) cur += ch;
    else { if (cur) cores.push(cur); cur = ''; }
  }
  if (cur) cores.push(cur);
  return cores.sort((a, b) => b.length - a.length);
}

// An all-kana gloss has no kanji to anchor on, so its invariant has to be taken by shape, and
// the shape rule only holds over a narrow band.
//
//   BELOW KANA_MIN_LEN the single stem character itself changes — する → し, 来る → き — so
//   there is no invariant at all and the gate refuses.
//   ABOVE KANA_MAX_LEN an all-kana string is not a word but a CONSTRUCTION
//   (どうもありがとうございます, まるでのように), whose parts inflect internally rather than at
//   the tail, so a leading run is not its invariant either. The gate refuses there too.
//
// Between them sits the class this rule does hold for: single kana lexemes — または, ところ,
// ほとんど, いくつかの, どうやって — which inflect, if at all, only in the final character.
const KANA_MIN_LEN = 3;
const KANA_MAX_LEN = 5;

/**
 * Kana-only glosses keep everything but their last character, which is the inflecting tail.
 * Returns null where the shape rule does not hold and the gate must refuse instead.
 */
function kanaCore(cleanedGloss) {
  const chars = [...cleanedGloss];
  if (chars.length < KANA_MIN_LEN || chars.length > KANA_MAX_LEN) return null;
  return chars.slice(0, chars.length - 1).join('');
}

// ─── The check ─────────────────────────────────────────────────────────

/**
 * Does one BUILD phrase's known-side prompt contain the known-side word its LEGO teaches?
 *
 * @param {string} legoKnown   the LEGO's known_text (the gloss — the word being taught)
 * @param {string} phraseKnown the BUILD phrase's known_text (the prompt the learner reads)
 * @param {object} opts        { knownLang, script, contract, courseCode }
 *                             `script` overrides detection; `contract` is a pair-contract
 *                             (for stemStrip on space-segmented known sides).
 * @returns {{status:string, reason?:string, detail?:string, cores?:string[], missing?:string[], mode?:string}}
 */
function checkBuildTeachesWord(legoKnown, phraseKnown, opts = {}) {
  const glossRaw = cleanGloss(legoKnown);
  const promptRaw = (phraseKnown || '').normalize('NFC');

  if (!glossRaw.trim()) return unchecked(TEACH_REASON.NO_GLOSS);
  if (!promptRaw.trim()) return unchecked(TEACH_REASON.EMPTY_PROMPT);

  const script = opts.script || detectScript(glossRaw);
  if (!script) return unchecked(REASON.SCRIPT_UNSUPPORTED, `no script detected for "${legoKnown}"`);

  // The prompt must be written in the known language's script. Where it is not, this is the
  // untranslated-prompt defect (Portuguese/English sitting in the Japanese field), not a
  // word-choice one — refuse rather than mis-file it as a violation.
  //
  // ONE-WAY COMPATIBILITY, and only this one: script detection calls a string Japanese on the
  // strength of its kana, so a Japanese prompt written ENTIRELY in kanji comes back as Han
  // (39 such prompts across the six courses, every one of them real Japanese). A Japanese gloss
  // therefore accepts a Han prompt. The converse does NOT hold — kana in a Chinese-known prompt
  // is a genuine wrong-language finding, so it is not waved through.
  if (script !== 'Latn' && !scriptsIn(promptRaw).some((s) => s === script || (script === 'Jpan' && s === 'Hani'))) {
    return unchecked(REASON.MIXED_SCRIPT, `prompt is not written in ${script}: "${phraseKnown}"`);
  }

  // The author's alternatives are disjunctive: satisfying any one of them is teaching the word.
  const alternatives = glossAlternatives(glossRaw);
  const bound = isBoundPattern(legoKnown);
  const results = alternatives.map((alt) => (
    NO_SPACE_SCRIPTS.has(script)
      ? checkNoSpace(alt, promptRaw, script, bound)
      : checkSpaced(alt, promptRaw, script, opts)
  ));

  const pass = results.find((r) => r.status === STATUS.PASS);
  if (pass) return pass;
  // No alternative passed. An UNCHECKED anywhere means the gate cannot speak for the whole
  // gloss — refusing beats convicting on the strength of the alternatives it happened to
  // understand.
  const refused = results.find((r) => r.status === STATUS.UNCHECKED);
  if (refused) return refused;
  const worst = results[0];
  return alternatives.length > 1
    ? { ...worst, detail: `prompt contains none of the taught alternatives ${alternatives.map((a) => `"${a}"`).join(' / ')}` }
    : worst;
}

/** Japanese / Chinese / Thai: no spaces, so containment is substring containment of the cores. */
function checkNoSpace(gloss, prompt, script, bound) {
  const g = stripPunct(gloss);
  const p = stripPunct(prompt);
  if (!g) return unchecked(TEACH_REASON.NO_CORES);

  if (script === 'Jpan') {
    const all = japaneseCores(g);
    if (all.length > 0) {
      // Pro-drop: a subject the gloss spells out need not be repeated in the prompt.
      const cores = all.filter((c) => !PRO_DROPPABLE.has(c));
      if (cores.length === 0) return unchecked(TEACH_REASON.NO_CORES, `gloss "${gloss}" is a bare pronoun, which Japanese may drop`);
      const missing = cores.filter((c) => !p.includes(c));
      return missing.length === 0
        ? { status: STATUS.PASS, cores, mode: 'kanji-core' }
        : { status: STATUS.VIOLATION, cores, missing, mode: 'kanji-core',
            detail: `prompt does not contain ${missing.map((m) => `"${m}"`).join(' / ')} from the taught word "${gloss}"` };
    }
    // All kana. A bound pattern declares its own inflection point, so it has no fixed leading
    // invariant and is refused outright rather than guessed at.
    if (bound) return unchecked(TEACH_REASON.BOUND_KANA_PATTERN, `gloss "${gloss}"`);
    const core = kanaCore(g);
    if (!core) return unchecked(TEACH_REASON.KANA_UNDECIDABLE, `gloss "${gloss}"`);
    return p.includes(core)
      ? { status: STATUS.PASS, cores: [core], mode: 'kana-core' }
      : { status: STATUS.VIOLATION, cores: [core], missing: [core], mode: 'kana-core',
          detail: `prompt does not contain "${core}" from the taught word "${gloss}"` };
  }

  // Chinese and Thai are isolating: there is no okurigana to vary, so the gloss stands as its
  // own invariant and containment is exact.
  return p.includes(g)
    ? { status: STATUS.PASS, cores: [g], mode: 'isolating' }
    : { status: STATUS.VIOLATION, cores: [g], missing: [g], mode: 'isolating',
        detail: `prompt does not contain the taught word "${gloss}"` };
}

/**
 * Space-segmented known sides.
 *
 * Exact word containment passes. Anything else is a morphology question, and morphology is a
 * language judgment: it is answered only where the pair-contract's agent-authored `stemStrip`
 * answers it, and otherwise refused. This is the same rule the known-side gate follows, for the
 * same reason — a regex that guesses "found is find" also guesses "founded is find".
 */
function checkSpaced(gloss, prompt, script, opts) {
  const contract = opts.contract || null;
  const knownLang = opts.knownLang || (contract && contract.known_lang) || null;
  const nOpts = { knownLang };
  const gTokens = tokens(normalizeKnown(gloss, nOpts));
  const pTokens = new Set(tokens(normalizeKnown(prompt, nOpts)));
  if (gTokens.length === 0) return unchecked(TEACH_REASON.NO_CORES);

  const free = contract ? new Set((contract.freeGlue || []).concat(contract.freeClass || []).map((s) => normalizeKnown(s, nOpts))) : new Set();
  const content = gTokens.filter((t) => !free.has(t));
  if (content.length === 0) return unchecked(TEACH_REASON.NO_CORES, 'the gloss is entirely free-class');

  const missing = content.filter((t) => !pTokens.has(t));
  if (missing.length === 0) return { status: STATUS.PASS, cores: content, mode: 'word' };

  const morphology = (contract && contract.morphology) || DEFAULT_MORPHOLOGY[script] || 'fusional';
  const stemStrip = (contract && contract.stemStrip) || null;
  if (morphology !== 'isolating' && !stemStrip) {
    return unchecked(REASON.MORPHOLOGY_UNRESOLVED, `"${missing.join('", "')}" absent from the prompt, and no contract stemStrip licenses an inflected reading`);
  }

  // A contract exists: let its stemStrip decide. Either side may carry the inflection — the
  // gloss may be the bare lemma and the prompt the inflected form ("want" / "wanted"), or the
  // gloss inflected and the prompt bare — so both directions are tried.
  const minLen = (contract && contract.stemMinLen) || 2;
  const promptInv = new Map([...pTokens].map((t) => [t, 0]));
  const stillMissing = missing.filter((t) => {
    if (morphology === 'isolating') return true;
    const glossInv = new Map([[t, 0]]);
    if (resolveByStemStrip(t, promptInv, stemStrip, minLen)) return false;
    for (const p of pTokens) if (resolveByStemStrip(p, glossInv, stemStrip, minLen)) return false;
    return true;
  });
  if (stillMissing.length === 0) return { status: STATUS.PASS, cores: content, mode: 'word+stemStrip' };
  return { status: STATUS.VIOLATION, cores: content, missing: stillMissing, mode: 'word',
    detail: `prompt does not contain ${stillMissing.map((m) => `"${m}"`).join(' / ')} from the taught word "${gloss}"` };
}

const NO_SPACE_PUNCT_RE = /[\s、。，．・…！？!?「」『』〈〉《》【】“”"'’‘·:;：；()（）]/gu;
function stripPunct(s) { return (s || '').replace(NO_SPACE_PUNCT_RE, ''); }
function tokens(s) { return (s || '').split(TOKEN_SPLIT_RE).filter(Boolean); }

function unchecked(reason, detail) {
  return { status: STATUS.UNCHECKED, reason, detail: detail || reasonText(reason) };
}

/**
 * Basket-level: run the check over one LEGO's BUILD rows.
 *
 * @param {object} lego  { known, build: [{known, target}] }  (accepts known_text/known_side too)
 * @param {object} opts  as checkBuildTeachesWord
 * @returns {{valid:boolean, violations:Array, unchecked:Array, checked:number}}
 *          `valid` is false only when a BUILD row is a VIOLATION. UNCHECKED never fails a basket
 *          and is reported separately so it can never be silently counted as a pass.
 */
function checkBuildBasketTeachesWord(lego, opts = {}) {
  const gloss = lego.known || lego.known_text || '';
  const rows = lego.build || [];
  const violations = [];
  const uncheckedRows = [];
  let checked = 0;
  rows.forEach((p, i) => {
    const r = checkBuildTeachesWord(gloss, p.known || p.known_text || '', opts);
    if (r.status === STATUS.VIOLATION) violations.push({ index: i, known: p.known || p.known_text, target: p.target, ...r });
    else if (r.status === STATUS.UNCHECKED) uncheckedRows.push({ index: i, known: p.known || p.known_text, reason: r.reason, detail: r.detail });
    else checked++;
  });
  return { valid: violations.length === 0, violations, unchecked: uncheckedRows, checked };
}

module.exports = {
  STATUS,
  TEACH_REASON,
  TEACH_REASON_TEXT,
  checkBuildTeachesWord,
  checkBuildBasketTeachesWord,
  japaneseCores,
  kanaCore,
  cleanGloss,
  KANA_MIN_LEN,
  KANA_MAX_LEN,
  glossAlternatives,
};
