/**
 * THE RULE (review #115): a malformed model reply is never cached as "no frames".
 * Only an explicit '-' (or a bare O) means empty; "unable to classify", an
 * analysis with no '=>', or a word that is not an id leaves the item unanswered,
 * and ensureTagged asks again. Caching a malformed line as a negative turned a
 * model hiccup into a permanent false coverage gap.
 *
 * Run: node --test tools/frame-layer/frame-tagger.test.cjs
 */
const test = require('node:test');
const assert = require('node:assert');
const T = require('./frame-tagger.cjs');

test('only ids, O and an explicit "-" are answers; anything else is malformed (null)', () => {
  const p = (line) => T.parseReply(line, 1)[0];
  assert.strictEqual(p('1: unable to classify'), null);
  assert.strictEqual(p("1: want + to-verb; don't"), null);
  assert.strictEqual(p('1: x => none'), null);
  assert.deepStrictEqual(p('1: -'), { frames: [], opener: false });
  assert.deepStrictEqual(p('1: thanks-opener => O -'), { frames: [], opener: true });
  assert.deepStrictEqual(p('1: want + to-verb; tomorrow => P1 P28.'), { frames: ['P1', 'P28'], opener: false });
});

test('ensureTagged retries a malformed line and never caches it as a negative', async () => {
  const cache = new T.MemoryCache();
  const replies = [
    '1: want + to-verb => P1\n2: unable to classify',   // item 2 malformed
    '1: negation => P23',                               // the retry, asked about item 2 alone
  ];
  const asked = [];
  const call = async (prompt) => { asked.push(prompt); return { text: replies.shift(), usage: { total: 1, output: 1, cost_usd: 0, ms: 1 } }; };
  const ledger = await T.ensureTagged(['I want to go', "I don't know"], { cache, call, log: () => {} });
  assert.deepStrictEqual(cache.get('I want to go').frames, ['P1']);
  assert.deepStrictEqual(cache.get("I don't know").frames, ['P23']);
  assert.strictEqual(asked.length, 2);
  assert.ok(asked[1].includes("I don't know") && !asked[1].includes('I want to go'));
  assert.deepStrictEqual(ledger.untagged, []);
});

test('an item the model never answers properly is reported untagged, not cached', async () => {
  const cache = new T.MemoryCache();
  const call = async () => ({ text: '1: no idea', usage: { total: 1, output: 1, cost_usd: 0, ms: 1 } });
  const ledger = await T.ensureTagged(['some phrase'], { cache, call, log: () => {} });
  assert.strictEqual(cache.has('some phrase'), false);
  assert.deepStrictEqual(ledger.untagged, ['some phrase']);
});

test('every cached row carries the parser generation and a time, so an old parser\'s rows can be found', () => {
  const fs = require('fs'), os = require('os'), path = require('path');
  const dir = fs.mkdtempSync(path.join(process.env.CS_SCRATCH || os.tmpdir(), 'tagcache-'));
  const cache = new T.TagCache({ dir });
  cache.put([['I want to go', { frames: ['P1'], opener: false }]], 'haiku');
  const row = JSON.parse(fs.readFileSync(cache.file, 'utf8').trim());
  assert.strictEqual(row.parser, 2);
  assert.ok(!Number.isNaN(Date.parse(row.at)));
});
