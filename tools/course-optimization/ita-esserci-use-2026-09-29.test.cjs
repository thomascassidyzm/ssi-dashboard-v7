'use strict';
const test = require('node:test');
const assert = require('node:assert');
const { ROWS, DROPPED, planProblems, hasEsserci } = require('./ita-esserci-use-2026-09-29.cjs');

const legosFor = (rows) => Object.fromEntries(rows.map((r) => [r.lego, { is_new: true, known_text: r.known.split(' ').slice(0, 2).join(' '), target_text: r.target.split(' ')[0] }]));

test('S0526 and S0363 are never inserted; every planned row says esserci / ci sarò', () => {
  for (const d of DROPPED) assert.ok(!ROWS.some((r) => r.lego === d.lego), d.lego);
  assert.deepStrictEqual(DROPPED.map((d) => d.lego).sort(), ['S0363L01', 'S0526L01']);
  for (const r of ROWS) assert.ok(hasEsserci(r.target), r.target);
});
test('plan holds against hosts that are new and contained; fails on a non-new host or a missing esserci', () => {
  const legos = legosFor(ROWS);
  assert.deepStrictEqual(planProblems({ ...legos, S0208L01: { is_new: true, known_text: "I didn't want to", target_text: 'non volevo' }, S0280L01: { is_new: true, known_text: 'I had to', target_text: 'dovevo' }, S0291L01: { is_new: true, known_text: 'I hope', target_text: 'spero' }, S0316L02: { is_new: true, known_text: 'monday', target_text: 'lunedì' }, S0320L01: { is_new: true, known_text: "he doesn't need to", target_text: 'non ha bisogno di' }, S0404L01: { is_new: true, known_text: "we shouldn't", target_text: 'non dovremmo' }, S0412L01: { is_new: true, known_text: "we couldn't", target_text: 'non potevamo' }, S0448L01: { is_new: true, known_text: "they'll be happy to", target_text: 'saranno felici di' }, S0579L02: { is_new: true, known_text: "we've often tried", target_text: 'abbiamo spesso provato' } }), []);
  assert.ok(planProblems({ ...legos, S0208L01: { is_new: false, known_text: "I didn't want to", target_text: 'non volevo' } }).some((p) => /not new/.test(p)));
  assert.ok(!hasEsserci('non volevo andare'));
});
