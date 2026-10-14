const test = require('node:test');
const assert = require('node:assert');
const { fix, fixRow } = require('./north-panad-cryf-191.cjs');

test('gref becomes cryf as a whole word only, panad/banad kept', () => {
  assert.strictEqual(fix('dw i isio panad gref o goffi neu de'), 'dw i isio panad cryf o goffi neu de');
  assert.strictEqual(fix('os na wnei di banad gref o goffi i mi'), 'os na wnei di banad cryf o goffi i mi');
  assert.strictEqual(fix('gref'), 'cryf');
  assert.strictEqual(fix('pregref'), 'pregref');
});
test('tile and component targets change, known side untouched', () => {
  const r = fixRow({ target_text: 'panad gref', components: [{ known: 'strong', target: 'gref' }] }, ['target_text', 'components']);
  assert.deepStrictEqual(r, { target_text: 'panad cryf', components: [{ known: 'strong', target: 'cryf' }] });
});
