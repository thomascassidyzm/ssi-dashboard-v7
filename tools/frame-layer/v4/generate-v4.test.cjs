// Proves the #471 fixes to the v4 generator: the model call is Fable at low
// effort (Tom named Fable for this work; --effort is what bounds thinking), and
// a candidate set is persisted by name the moment a call returns, so a refused
// retry can never lose it again (#468 lost a 60k-token French set that way).
// GEN_PATH lets the test be pointed at an older generate-v4.cjs to watch it fail.
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const gen = require(process.env.GEN_PATH || './generate-v4.cjs');
const { installTags } = require('../tag-fixtures.cjs');

test('the generator call is Fable at low effort', () => {
  const args = gen.claudeArgs();
  assert.strictEqual(args[args.indexOf('--model') + 1], 'fable');
  assert.strictEqual(args[args.indexOf('--effort') + 1], 'low');
});

test('a candidate set is written to disk per call, before anything else can lose it', () => {
  const dir = fs.mkdtempSync(path.join(process.env.CS_SCRATCH || os.tmpdir(), 'v4-persist-'));
  const file = path.join(dir, 'v4-fra_for_eng-281-290.json');
  const r = { phrases: [{ seed: 281, lego_index: 1, role: 'use', known: 'x', target: 'y' }], usage: { total: 10 } };
  const p = gen.persistCandidates(file, 'generate', r);
  assert.strictEqual(path.basename(p), 'v4-fra_for_eng-281-290.candidates-generate.json');
  const back = JSON.parse(fs.readFileSync(p, 'utf8'));
  assert.deepStrictEqual(back.phrases, r.phrases);
  assert.ok(!fs.existsSync(file), 'the final region file is not what persists the raw set');
});

// #31: gap fill ADDS phrases to live baskets, so a candidate the live course
// already carries (same English, same target) is refused there; a full-basket
// run replaces baskets, so the same row is fine.
test('additive gap fill refuses a phrase the live course already has', () => {
  installTags({ 'I want to go now': ['P1', 'P28'] });
  const lego = { seed_number: 5, lego_index: 1, known_text: 'I want', target_text: 'je veux', is_new: true };
  const data = { legos: [lego, { seed_number: 1, lego_index: 1, known_text: 'to go', target_text: 'aller' },
    { seed_number: 2, lego_index: 1, known_text: 'now', target_text: 'maintenant' }], components: [] };
  const liveZut = new Map([['i want to go now', [{ target: 'je veux aller maintenant', target_text: 'je veux aller maintenant', seed: 5 }]]]);
  const cand = [{ seed: 5, lego_index: 1, role: 'build', known: 'I want to go now', target: 'je veux aller maintenant' }];
  const opts = { course: 'fra_for_eng', data, newLegos: [lego], liveZut, available: ['P1', 'P28'] };
  assert.strictEqual(gen.gate(cand, opts).kept.length, 1);
  const g = gen.gate(cand, { ...opts, additive: true });
  assert.strictEqual(g.kept.length, 0);
  assert.ok(g.rejected[0].reasons.includes('already in the course'));
});

test('the gate refuses a candidate the frame tagger marks as opening with a stapled interjection', () => {
  installTags({ 'of course I want to go now': { frames: ['P1', 'P28'], opener: true } });
  const lego = { seed_number: 5, lego_index: 1, known_text: 'I want', target_text: 'je veux', is_new: true };
  const data = { legos: [lego, { seed_number: 1, lego_index: 1, known_text: 'to go', target_text: 'aller' },
    { seed_number: 2, lego_index: 1, known_text: 'now', target_text: 'maintenant' }, { seed_number: 3, lego_index: 1, known_text: 'of course', target_text: 'bien sûr' }], components: [] };
  const cand = [{ seed: 5, lego_index: 1, role: 'build', known: 'of course I want to go now', target: 'bien sûr je veux aller maintenant' }];
  const g = gen.gate(cand, { course: 'fra_for_eng', data, newLegos: [lego], liveZut: new Map(), available: ['P1', 'P28'] });
  assert.strictEqual(g.kept.length, 0);
  assert.ok(g.rejected[0].reasons.some(r => r.startsWith('stapled opener')));
});

test('a non-English known side is checked against what the course has already said (#924)', () => {
  assert.deepStrictEqual(gen.knownHeardCheck('मैं घर जाना चाहता हूँ', ['मैं जाना चाहता हूँ', 'घर'], false), []);
  assert.deepStrictEqual(gen.knownHeardCheck('मैं बाज़ार जाना चाहता हूँ', ['मैं जाना चाहता हूँ'], false), ['बाज़ार']);
  assert.deepStrictEqual(gen.knownHeardCheck('我想去', ['我想', '去'], true), []);
  assert.deepStrictEqual(gen.knownHeardCheck('我想吃', ['我想', '去'], true), ['吃']);
});

test('the ledger is resolved per call, so each window gets its own budget (#924)', () => {
  process.env.V4_LEDGER = 'ledger-301.json';
  assert.strictEqual(path.basename(gen.ledgerPath()), 'ledger-301.json');
  process.env.V4_LEDGER = 'ledger-311.json';
  assert.strictEqual(path.basename(gen.ledgerPath()), 'ledger-311.json');
  delete process.env.V4_LEDGER;
});
