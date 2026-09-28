// tools/course-optimization/swe-native-flags-web-evidence-2026-09-28.test.cjs
//
// Proves the swe_for_eng pass that settled #610·I's native-reader flags from corpus evidence (job #620·I):
// every row this pass changes, as it stood BEFORE (live on 2026-09-28), is flagged by the pure rule the pass
// applies, and the same row with the AFTER text is not — and every AFTER row still contains its LEGO on every
// side the pass writes. Runs with no network:
//   node --test tools/course-optimization/swe-native-flags-web-evidence-2026-09-28.test.cjs
const test = require('node:test');
const assert = require('node:assert');
const { webEvidenceDefect, containsWords, knownContainsGloss, CHANGES } = require('./swe-native-flags-web-evidence-2026-09-28.cjs');

// The LEGOs the changed rows sit under — live on 2026-09-28, none of them changed by the pass.
const LEGOS = {
  S0237L02: { known: 'the weekend (definite)', target: 'helgen' }, S0184L01: { known: 'the office', target: 'kontoret' },
  S0218L03: { known: 'sunday (definite)', target: 'söndagen' }, S0293L01: { known: 'where', target: 'var' },
  S0293L02: { known: 'meet (reflexive/each other)', target: 'träffas' }, S0297L01: { known: 'who speak Swedish', target: 'som pratar svenska' },
  S0059L01: { known: 'know', target: 'vet' }, S0202L04: { known: 'the question (definite)', target: 'frågan' },
  S0196L04: { known: 'the idea (definite)', target: 'idén' }, S0196L03: { known: 'latest/most recent', target: 'senaste' },
  S0204L01: { known: 'the arrangements', target: 'arrangemangen' }, S0210L02: { known: 'the problem (definite)', target: 'problemet' },
  S0227L01: { known: 'that (demonstrative)', target: 'den' }, S0066L02: { known: 'to find', target: 'hitta' },
};

test('every changed row is flagged before the pass and clean after it', () => {
  assert.strictEqual(CHANGES.length, 18);
  for (const c of CHANGES) {
    assert.ok(webEvidenceDefect(c.before.known, c.before.target), `${c.id} before "${c.before.target}" should be flagged`);
    assert.strictEqual(webEvidenceDefect(c.after.known, c.after.target), null, `${c.id} after "${c.after.target}" should be clean`);
  }
});

test('each flag letter maps to its own reason', () => {
  assert.strictEqual(webEvidenceDefect("i'll see you this weekend", 'jag ska träffas med dig i helgen'), 'traffas-med-object');
  assert.strictEqual(webEvidenceDefect('I know how to speak Swedish', 'jag vet hur man pratar svenska'), 'vet-hur-man-skill');
  assert.strictEqual(webEvidenceDefect('do you know the question?', 'vet du frågan?'), 'vet-definite-noun');
  assert.strictEqual(webEvidenceDefect('nobody knows the problem', 'ingen vet problemet'), 'vet-definite-noun');
  assert.strictEqual(webEvidenceDefect('she knows that', 'hon vet den'), 'vet-den');
  assert.strictEqual(webEvidenceDefect("it's important to find the answer yourself", 'det är viktigt att hitta svaret sig själv'), 'sig-sjalv-emphatic');
});

test('every AFTER row still contains its LEGO on every side the pass writes', () => {
  for (const c of CHANGES) {
    const L = LEGOS[c.lego];
    assert.ok(L, `${c.lego} known to the test`);
    if (c.side !== 'known') assert.ok(containsWords(c.after.target, L.target), `${c.id} target "${c.after.target}" contains "${L.target}"`);
    if (c.side !== 'target') assert.ok(knownContainsGloss(c.after.known, L.known), `${c.id} known "${c.after.known}" contains a reading of "${L.known}"`);
  }
});

test('shapes the evidence says are fine are not flagged (no false positives)', () => {
  // (a) i helgen confirmed; (d) fact-nouns after vet are normal; "vet om" / "svaret på frågan"; reciprocal träffas without an object
  for (const [k, t] of [
    ["she'll be here this weekend", 'hon ska vara här i helgen'],
    ['do you know the answer?', 'vet du svaret?'],
    ['I know the truth', 'jag vet sanningen'],
    ['do you know about the problem?', 'vet du om problemet?'],
    ['do you know the answer to the question?', 'vet du svaret på frågan?'],
    ['we want to meet', 'vi vill träffas'],
    ['he wants to meet with everyone else', 'han vill träffas med alla andra'],   // colloquial group use: recommended, not changed
    ["I don't know how to say enough different words yet", 'jag vet inte hur man säger tillräckligt många olika ord ännu'], // seed 60: a procedure, kept
    ['she wants that', 'hon vill ha den'],
    ['I want to test myself', 'jag vill testa mig'],
    ['test yourself', 'testa sig själv'],           // sig själv as a reflexive object is right
    ['do you know where?', 'vet du var?'],
    ['do you know nothing?', 'vet du inget?'],
    ["it's important to learn by yourself", 'det är viktigt att lära sig själv'],
    ["I think it's important to look after yourself", 'jag tror att det är viktigt att ta hand om sig själv'],
    ["I don't know", 'jag vet inte'],
  ]) assert.strictEqual(webEvidenceDefect(k, t), null, `"${t}" must not be flagged`);
});
