#!/usr/bin/env node
/**
 * Tests for scan-course Check 20 (seed containment). Run: node tools/seed-containment/tokenise.test.cjs
 *
 * These assert the RULE, so it cannot rot silently: a LEGO may contain only words its
 * own seed actually says, on both sides, and the check must FIRE on a planted defect in
 * a non-ASCII script rather than returning a clean pass it has not earned (canon WC-F2).
 */
const assert = require('assert');
const {
  tokenise, containment, isSpaceless, looksLikeVariantOf, tierOf, expandContraction,
} = require('./tokenise.cjs');

let pass = 0;
const t = (name, fn) => { fn(); pass += 1; console.log(`  ok  ${name}`); };

// --- the rule itself -------------------------------------------------------
t("Kai's own example: 'a person' is not in the seed", () => {
  const r = containment('a person', 'I want to meet someone new');
  assert.deepStrictEqual(r.missing, ['a', 'person']);
});

t('a true fragment of its seed is clean', () => {
  assert.deepStrictEqual(containment('I want to', 'I want to meet someone new').missing, []);
});

t('a grammar label is reported as a missing word', () => {
  assert.ok(containment('know-pl', 'you all know the answer').missing.includes('pl'));
});

t('a parenthetical annotation is reported word by word', () => {
  const r = containment('short (adjective)', 'the road is short');
  assert.deepStrictEqual(r.missing, ['adjective']);
});

t('a slash alternative is reported', () => {
  assert.ok(containment('well/good', 'I am well').missing.includes('good'));
});

t('a narrower gloss the seed never said fires', () => {
  assert.ok(containment('to know', "I'm not sure when I'll be ready").missing.includes('know'));
});

// --- tokenisation traps the canon has already been bitten by ---------------
t('contractions survive tokenisation (Check 11 idiom)', () => {
  assert.deepStrictEqual(tokenise("I don't know"), ['i', "don't", 'know']);
});

t('non-ASCII letters are words, not separators (WC-F4)', () => {
  assert.deepStrictEqual(tokenise('você grüß hoy'), ['você', 'grüß', 'hoy']);
});

t('PLANTED DEFECT, Arabic target side, must FIRE (WC-F2)', () => {
  const r = containment('هنا فقط', 'أنا هنا');
  assert.strictEqual(r.status, 'ok');
  assert.deepStrictEqual(r.missing, ['فقط']);
});

t('PLANTED DEFECT, Devanagari target side, must FIRE', () => {
  const r = containment('मुझे पता', 'मुझे नहीं मालूम');
  assert.strictEqual(r.status, 'ok');
  assert.ok(r.missing.includes('पता'));
});

t('Arabic question mark does not hide a taught word (WC-F4)', () => {
  assert.deepStrictEqual(containment('هنا', 'أنت هنا؟').missing, []);
});

t('Hebrew decomposed text is NFC-folded before comparison', () => {
  const composed = 'שָׁלוֹם';
  const decomposed = composed.normalize('NFD');
  assert.deepStrictEqual(containment(decomposed, composed).missing, []);
});

t('trailing punctuation alone never invents a missing word (WC-F9)', () => {
  assert.deepStrictEqual(containment('are you ready', 'Are you ready?').missing, []);
});

// --- spaceless scripts are EXCLUDED, never reported clean -------------------
t('Japanese is excluded rather than passed', () => {
  assert.strictEqual(containment('わかる', '私は答えがわかる').status, 'excluded_spaceless');
});
t('Chinese is excluded rather than passed', () => {
  assert.strictEqual(containment('知道', '我不知道').status, 'excluded_spaceless');
});
t('Thai is excluded rather than passed', () => {
  assert.strictEqual(containment('รู้', 'ฉันไม่รู้').status, 'excluded_spaceless');
});
t('a spaceless KNOWN side excludes the pair too', () => {
  assert.strictEqual(containment('hello', '你好，我是').status, 'excluded_spaceless');
});
t('Korean and Vietnamese are spaced, so they are analysed', () => {
  assert.ok(!isSpaceless('저는 준비가 되었어요'));
  assert.ok(!isSpaceless('tôi không biết'));
});
t('a Latin lego against a Latin seed with one CJK stray still analyses', () => {
  assert.ok(!isSpaceless('I am ready to go now and then'));
});

// --- tiering ---------------------------------------------------------------
t('an inflection is tiered variant, not lexical', () => {
  const r = containment('know', 'she knows the answer');
  assert.strictEqual(tierOf('know', r.missing, r.seedTokens), 'variant');
});
t('a fresh word with no relative is tiered lexical', () => {
  const r = containment('a person', 'I want to meet someone new');
  assert.strictEqual(tierOf('a person', r.missing, r.seedTokens), 'lexical');
});
t('anything bracketed or slashed is tiered markup', () => {
  const r = containment('short (adjective)', 'the road is short');
  assert.strictEqual(tierOf('short (adjective)', r.missing, r.seedTokens), 'markup');
});
t('variant detection needs a real prefix share, not a shared ending', () => {
  assert.strictEqual(looksLikeVariantOf('sostener', ['mantener']), null);
});


// --- contraction expansion, applied to both sides identically --------------
t("a seed's contraction says the words it contracts", () => {
  const r = containment('I am', "I'm not sure if I can remember");
  assert.deepStrictEqual(r.missing, []);
  assert.strictEqual(r.contraction_only, true, 'and it says so, rather than hiding it');
});
t("n't expands to not", () => {
  assert.deepStrictEqual(containment('do not', "I don't know").missing, []);
});
t("can't and won't are irregular and handled", () => {
  assert.deepStrictEqual(containment('can not', "I can't go").missing, []);
  assert.deepStrictEqual(containment('will not', "he won't go").missing, []);
});
t('a contracted lego against an uncontracted seed also passes', () => {
  assert.deepStrictEqual(containment("I'm", 'I am ready').missing, []);
});
t('a non-English apostrophe is never mangled', () => {
  assert.strictEqual(expandContraction("l'homme"), null);
  assert.strictEqual(expandContraction("c'è"), null);
  assert.deepStrictEqual(containment("l'homme", "voici l'homme").missing, []);
});
t('contraction expansion does not hide a real missing word', () => {
  assert.deepStrictEqual(containment("I'm a person", "I'm here").missing, ['a', 'person']);
});


// --- the four mechanical false positives found by reading the first run ----
// Each of these was a hit on 2026-09-10's first pass and each was WRONG: the word IS
// in the seed. They are pinned so the normalisation that fixed them cannot be lost.
t('FP1: Arabic tashkil in the seed is not a different word (WC-F4)', () => {
  assert.deepStrictEqual(containment('تعني', 'لا أَعْرِفُ مَنْ تَعْني').missing, []);
});
t('FP2: Arabic tashkil, longer case', () => {
  assert.deepStrictEqual(containment('معه', 'كُنْتَ تَتَكَلَّمُ مَعَهُ أَمْس؟').missing, []);
});
t("FP3: a Welsh apostrophe clitic still says the word before it", () => {
  assert.deepStrictEqual(containment('maen nhw', 'maen nhw\u2019n hapus').missing, []);
});
t('FP4: a seed that spaces what the lego joins says the same word (Nepali)', () => {
  assert.deepStrictEqual(containment('हिजोभन्दा खराब', 'म आज हिजो भन्दा खराब गर्दैछु।').missing, []);
});
t('FP4 in reverse: a seed that joins what the lego spaces', () => {
  assert.deepStrictEqual(containment('hijo bhanda', 'aaja hijobhanda kharab').missing, []);
});
t('the join rule cannot swallow an unrelated short word', () => {
  assert.deepStrictEqual(containment('I am a person', 'I am here').missing, ['a', 'person']);
});
t('stripping tashkil does not strip Devanagari or Hebrew vowel marks', () => {
  assert.ok(containment('मैं', 'मे यहाँ').missing.length, 'Devanagari matras still distinguish words');
});

console.log(`\n${pass} passed`);
