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
