'use strict';
// Proves the S0117 baskets: every new row contains its LEGO (Kai: P17) and uses only words taught by S0117 — and that the check bites.
const test = require('node:test');
const assert = require('node:assert');
const t = require('./eng-for-hin-607-117-recut-2026-10-29.cjs');
const fs = require('fs');
const dumpPath = process.env.RECUT_DUMP; // a read-only course dump taken before the apply (skipped without it)
const mk = (li, ro, p) => ({ op: 'phrase.insert', row: { id: 'x', seed_number: 117, lego_index: li, metadata: {}, known_text: p[0], target_text: p[1], phrase_role: ro } });
const rows = () => [].concat(
  t.L02_BUILD.map((p) => mk(2, 'build', p)), t.L02_USE.map((p) => mk(2, 'use', p)),
  t.L03_BUILD.map((p) => mk(3, 'build', p)), t.L03_USE.map((p) => mk(3, 'use', p)), t.L04_PLAIN_USE.map((p) => mk(4, 'use', p)));
test('new S0117 rows contain their LEGO and use only taught words', { skip: !dumpPath }, () => {
  const dump = JSON.parse(fs.readFileSync(dumpPath, 'utf8'));
  assert.deepStrictEqual(t.checks(dump, rows()), []);
  const bad = rows(); bad[0].row.target_text = 'I am doing better today';
  assert.ok(t.checks(dump, bad).some((p) => /lacks "last time"/.test(p)));
});
test('the seed sentence is a USE row under the last LEGO (P26)', () => {
  assert.ok(t.L04_PLAIN_USE.some(([k, tg]) => k === t.SEED_117.known && tg + '.' === t.SEED_117.target));
});
