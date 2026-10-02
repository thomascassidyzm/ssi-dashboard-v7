'use strict';
// The rules behind job #358 (deu_for_eng, Kai's Italian rulings applied where the fix is obvious): every hand
// change's BEFORE text is a defect of its class and its AFTER text is not; the P26 hold keeps a seed whose own new
// LEGO's gloss is not its wording out of another seed's basket.
const test = require('node:test');
const assert = require('node:assert/strict');
const T = require('./deu-italian-rules-apply-2026-10-02.cjs');

// The verb-final LEGOs the E rows sit under (read live 2026-10-02; the tool re-reads and guards them).
const LEGO_TARGET = { S0113L01: 'du gesagt hast', S0117L05: 'wir geredet haben', S0127L02: 'ich dich sehen wollte', S0129L02: 'du es so gut machst', S0336L03: 'sie die Tür öffnen kann', S0344L02: 'dir gern hilft', S0201L01: 'passieren würde' };
const lego = (c) => LEGO_TARGET[c.id.slice(0, 8)];

test('E: all 24 rows use a verb-final chunk as a main clause (or ask a direct question over it) BEFORE; none AFTER', () => {
  const E = T.CHANGES.filter(c => c.cls === 'E');
  assert.equal(E.length, 24);
  for (const c of E) assert.ok(T.isDefect('E', c.before, lego(c)), `${c.id} before should be a defect: ${c.before.target}`);
  for (const c of E.filter(c => c.after)) assert.ok(!T.isDefect('E', c.after, lego(c)), `${c.id} after still a defect: ${c.after.target}`);
  assert.equal(T.verbFinalAsMainClause('Du gesagt hast dass es schwierig war', 'du gesagt hast'), true);
  assert.equal(T.verbFinalAsMainClause('Ich weiß, was du gesagt hast', 'du gesagt hast'), false);
  assert.equal(T.verbFinalAsMainClause('er dir gern hilft', 'dir gern hilft'), true);
  assert.equal(T.verbFinalAsMainClause('weil er dir gern hilft', 'dir gern hilft'), false);
});

test('F: all 16 rows render "would" as wollte BEFORE; würde AFTER', () => {
  const F = T.CHANGES.filter(c => c.cls === 'F');
  assert.equal(F.length, 16);
  for (const c of F) { assert.ok(T.wollteForWould(c.before.known, c.before.target), c.id); assert.ok(!T.isDefect('F', c.after), c.id); assert.match(c.after.target, /\bwürde\b/); }
});

test('C: all 20 rows carry a word no LEGO teaches BEFORE; none AFTER (11 deleted)', () => {
  const C = T.CHANGES.filter(c => c.cls === 'C');
  assert.equal(C.length, 20);
  for (const c of C) assert.ok(T.hasUntaughtLexeme(c.before.target), c.id);
  for (const c of C.filter(c => c.after)) assert.ok(!T.hasUntaughtLexeme(c.after.target), c.id);
  assert.equal(C.filter(c => !c.after).length, 11);
  assert.equal(T.hasUntaughtLexeme('Ich habe es gestern geschickt'), false); // a control that must not fire
});

test('P26 hold: a seed with its own new LEGO uncontained is held, not parked under another seed', () => {
  const legos = [{ lego_id: 'S0222L01', seed_number: 222, is_new: true, known_text: 'He is trying to tell me what he wants', target_text: 'er versucht mir zu sagen, was er will' }];
  assert.match(T.p26Hold({ seed: 222, why: 'earliest later new LEGO', lego_id: 'S0420L03', lego_known: 'he', lego_seed: 420 }, legos), /gloss ≠ seed wording/);
  assert.equal(T.p26Hold({ seed: 222, why: 'own last new LEGO', lego_id: 'S0222L01' }, legos), null);
  assert.equal(T.p26Hold({ seed: 367, why: 'nearest earlier new LEGO', lego_id: 'S0202L01' }, legos), null); // no own new LEGO: allowed
  assert.match(T.p26Hold({ seed: 639, why: 'own last new LEGO', lego_id: 'S0639L01' }, legos), /fragment/);
});
