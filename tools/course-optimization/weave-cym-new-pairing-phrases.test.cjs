// Tom's review of PR #80 (job #550): the sql step restarted its position / USE-number counters
// for every pairing, so two pairings carried by the SAME host LEGO (--legos 1092:1,1092:3, both
// hosted by 1092's last new LEGO) were given the same add_rows ids and positions. The counters
// are kept per (seed, host) across the whole run.
// Run: node --test tools/course-optimization/weave-cym-new-pairing-phrases.test.cjs
const test = require('node:test');
const assert = require('node:assert');
const { pairingRows } = require('./weave-cym-new-pairing-phrases.cjs');

const result = (l, use) => ({
  hostIndex: 4, hostTarget: 'dw i’n mynd', legoKnown: `known ${l}`, legoTarget: `target ${l}`,
  taughtAs: { known_text: 'k', target_text: 't', seed_number: 10 }, use,
});

test('two pairings sharing a host get distinct ids and positions after the live basket', () => {
  const C = 'cym_sv2_for_eng';
  const baskets = new Map([['1092:4', [
    { id: 'S1092L04B01', position: 1, phrase_role: 'build' },
    { id: 'S1092L04U02', position: 2, phrase_role: 'use' },
  ]]]);
  const rows = pairingRows(C, [
    { s: 1092, l: 1, r: result(1, [{ known: 'a', target: 'dw i’n mynd a' }, { known: 'b', target: 'dw i’n mynd b' }]) },
    { s: 1092, l: 3, r: result(3, [{ known: 'c', target: 'dw i’n mynd c' }]) },
  ], baskets, 587);
  assert.strictEqual(rows.length, 3);
  assert.strictEqual(new Set(rows.map(r => r.id)).size, 3, `ids collide: ${rows.map(r => r.id).join(', ')}`);
  assert.deepStrictEqual(rows.map(r => r.position), [3, 4, 5]);
  assert.ok(rows.every(r => !['S1092L04B01', 'S1092L04U02'].includes(r.id)));
});

test('different hosts keep their own counters', () => {
  const rows = pairingRows('cym_sv2_for_eng', [
    { s: 1092, l: 1, r: result(1, [{ known: 'a', target: 'x' }]) },
    { s: 1093, l: 1, r: result(1, [{ known: 'b', target: 'y' }]) },
  ], new Map(), 587);
  assert.deepStrictEqual(rows.map(r => r.position), [1, 1]);
  assert.notStrictEqual(rows[0].id, rows[1].id);
});
