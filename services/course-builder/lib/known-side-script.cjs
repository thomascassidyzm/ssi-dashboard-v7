/**
 * Script-aware segmentation for the KNOWN-side untaught-word gate.
 *
 * WHY THIS FILE EXISTS
 * --------------------
 * The known-side gate tokenized with `split(/[^a-z']+/)` — ASCII letters only. Two consequences,
 * both silent:
 *
 *   1. NON-LATIN KNOWN SIDES (Devanagari, Bengali, Tamil, Telugu, Kannada, Gujarati, Gurmukhi,
 *      Sinhala, Arabic, Japanese, Korean, Han) produce ZERO tokens. Zero tokens means zero
 *      violations means the gate reports PASS. 31 courses had no protection from this gate at all.
 *   2. ACCENTED LATIN is silently mutilated. `'ṣé'` yields no token; `'mo ṣe'` yields `['mo','e']` —
 *      a token 'e' that was never in the text. That is the Irish trap, twice bitten
 *      (docs/a108 gle notes): a bare word-boundary regex splits accented words and miscounts.
 *
 * The fix is not "a better regex". It is: segment per script, and REFUSE — loudly, with a reason —
 * where segmentation cannot answer the question. A gate that cannot fail loudly is worse than no
 * gate, because it manufactures false confidence. Everything here therefore returns either an
 * answer or an UNCHECKED reason; nothing here is allowed to return "fine" by default.
 *
 * ESTATE RULE OBSERVED (CLAUDE.md / HANDOFF-kai-eng-for-x.md §3): no regex ever makes a LANGUAGE
 * JUDGMENT. This module only counts and segments. Whether an unmatched token is a new lemma or an
 * inflection of a taught one is a language judgment — so for fusional/agglutinative known sides
 * this module reports `morphology_unresolved` and hands the row to the agent lane rather than
 * inventing a verdict in either direction.
 *
 * Pure. No DB, no I/O.
 */

// ─── UNCHECKED reason codes ────────────────────────────────────────────
// Every one of these is a case the OLD gate reported as PASS.
const REASON = {
  NO_CONTRACT: 'no_contract',
  CONTRACT_LANG_MISMATCH: 'contract_lang_mismatch',
  SCRIPT_UNSUPPORTED: 'script_unsupported',
  SEGMENTER_UNAVAILABLE: 'segmenter_unavailable',
  NO_VOCAB_INVENTORY: 'no_vocab_inventory',
  TOKENIZER_EMPTY: 'tokenizer_empty',
  MORPHOLOGY_UNRESOLVED: 'morphology_unresolved',
  MIXED_SCRIPT: 'mixed_script',
  EMPTY_TEXT: 'empty_text',
};

const REASON_TEXT = {
  no_contract: 'no pair-contract or known-language brief exists for this course, so the gate never ran',
  contract_lang_mismatch: "the contract's known_lang does not match the course's known language",
  script_unsupported: 'no segmentation strategy is declared or inferable for this script',
  segmenter_unavailable: 'Intl.Segmenter has no ICU word-break data for this locale',
  no_vocab_inventory: 'the course has no introduced glosses to check against',
  tokenizer_empty: 'the text is non-empty but segmentation produced zero tokens (the original silent-pass bug)',
  morphology_unresolved: 'token is not an exact introduced form and the known language inflects; whether it is a new lemma or an inflection of a taught one is a language judgment this gate must not make',
  mixed_script: 'token is written in a script other than the one the contract declares',
  empty_text: 'the prompt is empty',
};

// ─── Script detection ──────────────────────────────────────────────────
// ISO 15924 codes for the scripts actually present on this estate. Ordered so the
// first match wins; Han is tested after Kana/Hangul because Japanese and Korean text
// mixes Han in.
const SCRIPT_RANGES = [
  ['Hang', /[가-힯ᄀ-ᇿ㄰-㆏]/u],
  ['Jpan', /[぀-ゟ゠-ヿ]/u],                 // kana ⇒ Japanese
  ['Hani', /[㐀-䶿一-鿿豈-﫿]/u],     // Han without kana ⇒ Chinese
  ['Deva', /[ऀ-ॿ]/u],
  ['Beng', /[ঀ-৿]/u],
  ['Guru', /[਀-੿]/u],
  ['Gujr', /[઀-૿]/u],
  ['Orya', /[଀-୿]/u],
  ['Taml', /[஀-௿]/u],
  ['Telu', /[ఀ-౿]/u],
  ['Knda', /[ಀ-೿]/u],
  ['Mlym', /[ഀ-ൿ]/u],
  ['Sinh', /[඀-෿]/u],
  ['Thai', /[฀-๿]/u],
  ['Arab', /[؀-ۿݐ-ݿﭐ-﷿ﹰ-﻿]/u],
  ['Hebr', /[֐-׿יִ-ﭏ]/u],
  ['Cyrl', /[Ѐ-ӿ]/u],
  ['Grek', /[Ͱ-Ͽἀ-῿]/u],
  ['Armn', /[԰-֏]/u],
  ['Latn', /[\p{Script=Latin}]/u],
];

/** Detect the dominant script of a string. Returns an ISO 15924 code or null. */
function detectScript(text) {
  if (!text) return null;
  for (const [code, re] of SCRIPT_RANGES) if (re.test(text)) return code;
  return null;
}

/** Every script present in the string (used to flag mixed-script prompts). */
function scriptsIn(text) {
  const found = [];
  if (!text) return found;
  for (const [code, re] of SCRIPT_RANGES) if (re.test(text)) found.push(code);
  return found;
}

// Scripts written WITHOUT inter-word spaces. These cannot be tokenized by splitting on
// non-letters; they need either a dictionary segmenter or DP tiling over the inventory.
const NO_SPACE_SCRIPTS = new Set(['Jpan', 'Hani', 'Thai']);

// Scripts whose orthographic word packs several morphemes, so exact-form matching against a
// lemma inventory systematically over-reports. Declared per-contract normally; this is the
// fallback when a contract omits `morphology`.
const DEFAULT_MORPHOLOGY = {
  Jpan: 'agglutinative', Hang: 'agglutinative', Taml: 'agglutinative', Telu: 'agglutinative',
  Knda: 'agglutinative', Mlym: 'agglutinative', Sinh: 'agglutinative',
  Deva: 'fusional', Beng: 'fusional', Guru: 'fusional', Gujr: 'fusional', Orya: 'fusional',
  Arab: 'fusional', Hebr: 'fusional', Cyrl: 'fusional', Grek: 'fusional', Armn: 'fusional',
  Hani: 'isolating', Thai: 'isolating', Latn: 'fusional',
};

/** ICU locale to hand Intl.Segmenter for a script. */
const SCRIPT_LOCALE = { Jpan: 'ja', Hani: 'zh', Thai: 'th', Hang: 'ko' };

// ─── Normalisation ─────────────────────────────────────────────────────
//
// NFC, lowercase, strip cosmetic punctuation. Deliberately DOES NOT strip diacritics:
// on this estate accents are contrastive orthography (Irish síneadh fada, Yoruba tone marks —
// and Yoruba has no precomposed forms at all, so its accents live as combining marks that a
// \p{L}-only class would drop). Arabic tashkeel IS stripped, matching the estate's existing
// normalizeForContainment.
// NOTE: the apostrophe family (' ’ ‘) is deliberately NOT stripped. It is contrastive on this
// estate — English contractions, Irish/Italian/French elision (l'homme ≠ le homme), and the
// documented hazard that apostrophe-mangling breaks non-English words (German "geht's").
const PUNCT_RE = /[.,;:!?¿¡«»""“”„‟…—–\-()\[\]{}<>/\\|@#$%^&*+=~`。，！？、：；「」『』（）〈〉《》؟،؛۔॥।٬٫։՝՞՜]/gu;
const TASHKEEL_RE = /[ً-ْٰـ]/gu;
const ZERO_WIDTH_RE = /[​‌‎‏﻿]/gu;

// English contraction expansion, so the base word and the function word are checked separately
// (shouldn't → should not). Applied ONLY when the contract says the known language is English:
// applying it to other languages corrupts them (German "geht's" → "geht is").
function expandEnglishContractions(s) {
  return (s || '')
    .replace(/n['’]t\b/gi, ' not')
    .replace(/['’]ve\b/gi, ' have').replace(/['’]re\b/gi, ' are').replace(/['’]m\b/gi, ' am')
    .replace(/['’]ll\b/gi, ' will').replace(/['’]d\b/gi, ' would').replace(/['’]s\b/gi, ' is');
}

function normalizeKnown(text, opts = {}) {
  if (!text) return '';
  if (opts.expandContractions) text = expandEnglishContractions(String(text));
  return String(text)
    .normalize('NFC')
    .replace(ZERO_WIDTH_RE, '')
    .replace(TASHKEEL_RE, '')
    .replace(PUNCT_RE, ' ')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

// A token is letters (any script), combining marks (Yoruba/Devanagari/Hebrew vowel points),
// digits, ZWJ (Indic conjuncts) and the apostrophe (English contractions, Irish/Italian elision).
const TOKEN_SPLIT_RE = /[^\p{L}\p{M}\p{N}'’‍]+/u;

/**
 * Segment a known-side prompt into tokens.
 *
 * @returns {{tokens: string[], strategy: string, script: string|null, unchecked: Array<{reason,detail}>}}
 *   `unchecked` non-empty means the caller MUST NOT treat an empty violation list as a pass.
 */
function segmentKnown(rawText, opts = {}) {
  const unchecked = [];
  const text = normalizeKnown(rawText, opts);
  if (!text) {
    return { tokens: [], strategy: 'none', script: null, unchecked: [{ reason: REASON.EMPTY_TEXT, detail: REASON_TEXT.empty_text }] };
  }

  const declaredScript = opts.script || null;
  const script = detectScript(text) || declaredScript;
  if (!script) {
    return {
      tokens: [], strategy: 'none', script: null,
      unchecked: [{ reason: REASON.SCRIPT_UNSUPPORTED, detail: `${REASON_TEXT.script_unsupported} (no script detected in ${JSON.stringify(rawText).slice(0, 60)})` }],
    };
  }

  // Mixed script is not itself a failure (Japanese mixes kana+Han by design, Indic prompts
  // carry Latin proper nouns) — but a token in an UNDECLARED script is a real signal, so the
  // caller gets told. Reported, never silently dropped.
  if (declaredScript && script !== declaredScript) {
    const all = scriptsIn(text);
    if (!all.includes(declaredScript)) {
      unchecked.push({ reason: REASON.MIXED_SCRIPT, detail: `${REASON_TEXT.mixed_script}: contract declares ${declaredScript}, text is ${all.join('+')}` });
    }
  }

  const segmentation = opts.segmentation || (NO_SPACE_SCRIPTS.has(script) ? 'dictionary' : 'space');

  if (segmentation === 'dictionary') {
    const locale = SCRIPT_LOCALE[script] || 'und';
    let tokens;
    try {
      if (typeof Intl.Segmenter !== 'function') throw new Error('no Intl.Segmenter');
      const seg = new Intl.Segmenter(locale, { granularity: 'word' });
      tokens = [...seg.segment(text)].filter((s) => s.isWordLike).map((s) => s.segment);
    } catch (err) {
      return {
        tokens: [], strategy: 'dictionary', script,
        unchecked: [...unchecked, { reason: REASON.SEGMENTER_UNAVAILABLE, detail: `${REASON_TEXT.segmenter_unavailable} (${locale}): ${err.message}` }],
      };
    }
    // ICU word-break with no dictionary data degenerates to one token per character.
    // That is not segmentation; say so rather than checking nonsense.
    if (tokens.length && tokens.every((t) => [...t].length === 1) && [...text.replace(/\s/g, '')].length > 3) {
      unchecked.push({ reason: REASON.SEGMENTER_UNAVAILABLE, detail: `${REASON_TEXT.segmenter_unavailable} (${locale}): word-break degenerated to one token per character` });
    }
    if (!tokens.length) unchecked.push({ reason: REASON.TOKENIZER_EMPTY, detail: REASON_TEXT.tokenizer_empty });
    return { tokens, strategy: 'dictionary', script, unchecked };
  }

  const tokens = text.split(TOKEN_SPLIT_RE).filter(Boolean);
  // THE ORIGINAL BUG, now loud: non-empty text, zero tokens.
  if (!tokens.length) unchecked.push({ reason: REASON.TOKENIZER_EMPTY, detail: `${REASON_TEXT.tokenizer_empty}: ${JSON.stringify(rawText).slice(0, 80)}` });
  return { tokens, strategy: segmentation, script, unchecked };
}

// ─── Lemma resolution ──────────────────────────────────────────────────

/**
 * Try to reduce a token to an introduced lemma by stripping declared suffixes.
 * Returns the matched lemma, or null. Contract-driven: `stemStrip` is authored per
 * known language by an agent that read the corpus. An empty stemStrip means the
 * language's orthography does not reward naive stripping — a correct, honest answer.
 */
function resolveByStemStrip(token, inventory, stemStrip, minLen) {
  if (!stemStrip || !stemStrip.length) return null;
  const floor = minLen || 2;
  for (const suf of stemStrip) {
    if (!token.endsWith(suf)) continue;
    const stem = token.slice(0, token.length - suf.length);
    if ([...stem].length < floor) continue;
    if (inventory.has(stem)) return stem;
    // one further strip — Korean/Tamil stack two clitics (책들을 → 책들 → 책)
    for (const suf2 of stemStrip) {
      if (!stem.endsWith(suf2)) continue;
      const stem2 = stem.slice(0, stem.length - suf2.length);
      if ([...stem2].length < floor) continue;
      if (inventory.has(stem2)) return stem2;
    }
  }
  return null;
}

/**
 * Resolve a CV-reduplicated nominal (gerund) to its introduced base verb.
 *
 * OPT-IN, CONTRACT-DRIVEN, ADDITIVE: it runs only when a contract declares `reduplicativeNominal`,
 * which today is `_known_yor` alone. Every other course on the estate is bit-for-bit unaffected.
 *
 * WHY IT EXISTS: stemStrip removes SUFFIXES only. Yoruba's one productive affix is a PREFIX — the
 * gerund copies the verb's initial consonant and prefixes C+í (sọ → sísọ, ṣe → ṣíṣe, lo → lílo).
 * Without this, a gerund of a taught verb reads as "never introduced", which is a language judgment
 * the string machinery is not entitled to make. WITH it, the gerund is dated against its base, so a
 * gerund of a verb taught LATER is still a violation — the same contract as stemStrip / exemption E2.
 *
 * LIMIT, stated because it bounds the claim: the test is a string shape, so a CíC-shaped token whose
 * first two consonants merely coincide with a taught word would also "resolve" (Yoruba pípé 'complete'
 * onto pé 'that'). Exact match is tried before this, so it only reaches tokens with no introduction of
 * their own; any hit is evidence for a human, not a proof of derivation.
 *
 * @returns the matched base form, or null.
 */
function resolveByReduplication(token, inventory, spec) {
  if (!spec) return null;
  const chars = [...token];
  if (chars.length < 3) return null;
  const vowels = spec.vowels || ['í', 'ì', 'i'];
  if (!vowels.includes(chars[1])) return null;
  if (spec.requireConsonantCopy !== false && chars[2] !== chars[0]) return null;
  const base = chars.slice(2).join('');
  return inventory.has(base) ? base : null;
}

/**
 * Does any introduced form sit inside this token as a prefix?
 * Suffixing languages (all the agglutinative ones on this estate) attach material to the
 * RIGHT, so an introduced lemma at the left edge means the token is plausibly an inflection
 * of taught vocabulary. This is evidence, NOT a verdict — it feeds `morphology_unresolved`,
 * never a pass. Its only hard use is the inverse: a token containing no introduced form at
 * all, anywhere, is new vocabulary by any reading, and THAT is a high-confidence violation.
 */
function stemPrefixHit(token, inventory, minLen) {
  const floor = minLen || 2;
  const chars = [...token];
  for (let n = chars.length - 1; n >= floor; n--) {
    const pre = chars.slice(0, n).join('');
    if (inventory.has(pre)) return pre;
  }
  return null;
}

/** Any introduced form occurring anywhere inside the token (weakest evidence). */
function anyStemInside(token, inventoryList, minLen) {
  const floor = minLen || 2;
  for (const entry of inventoryList) {
    if ([...entry].length < floor) continue;
    if (token.includes(entry)) return entry;
  }
  return null;
}

// ─── DP tiling (no-space scripts) ──────────────────────────────────────

/**
 * Can `text` be tiled end-to-end by entries of `inventory`?
 * Returns null if fully tiled, else the first substring it cannot get past.
 *
 * LIMIT, stated because it bounds every Japanese/Chinese/Thai number in the report:
 * tiling is permissive. Single-character inventory entries (a taught particle like の or 了)
 * can bridge arbitrary positions, so tiling can succeed over text that a human would call
 * untaught. It under-reports; it does not over-report. A tiling FAILURE is therefore strong
 * evidence, a tiling SUCCESS is weak evidence of "all taught".
 */
function tileUncovered(text, inventoryList) {
  const chars = [...text];
  const n = chars.length;
  if (!n) return null;
  const dp = new Array(n + 1).fill(false);
  dp[0] = true;
  const byLen = inventoryList.map((e) => [...e]).filter((a) => a.length);
  for (let i = 1; i <= n; i++) {
    for (const entry of byLen) {
      const len = entry.length;
      if (len > i || !dp[i - len]) continue;
      let ok = true;
      for (let j = 0; j < len; j++) if (chars[i - len + j] !== entry[j]) { ok = false; break; }
      if (ok) { dp[i] = true; break; }
    }
  }
  if (dp[n]) return null;
  let last = 0;
  for (let i = 0; i <= n; i++) if (dp[i]) last = i;
  return chars.slice(last).join('');
}

module.exports = {
  REASON,
  REASON_TEXT,
  detectScript,
  scriptsIn,
  normalizeKnown,
  segmentKnown,
  resolveByStemStrip,
  resolveByReduplication,
  stemPrefixHit,
  anyStemInside,
  tileUncovered,
  expandEnglishContractions,
  NO_SPACE_SCRIPTS,
  DEFAULT_MORPHOLOGY,
  SCRIPT_LOCALE,
  TOKEN_SPLIT_RE,
};
