'use strict';
// node --test tools/course-optimization/deu-could-rule-2026-10-14.test.cjs
const test = require('node:test');
const assert = require('node:assert');
const T = require('./deu-could-rule-2026-10-14.cjs');
const { ROWS, HELD } = require('./deu-could-rule-2026-10-14.data.cjs');

const ph = (sid, known, target, role = 'use') => ({ id: `deu_for_eng:${sid}`, phrase_role: role, known_text: known, target_text: target });
// seed 311 as it stood on 14 Oct, before job #489
const before = () => ({
  seeds: [{ seed_number: 311, known_text: "he couldn't believe the three most important facts", target_text: 'er konnte die drei wichtigsten Fakten nicht glauben' }],
  legos: [{ lego_id: 'S0311L01', is_new: true, known_text: 'he could not', target_text: 'er konnte nicht', components: [{ known: 'he', target: 'er' }, { known: 'could not', target: 'konnte nicht' }] }],
  phrases: [
    ph('S0311L01C01', 'he', 'er', 'component'), ph('S0311L01C02', 'could not', 'konnte nicht', 'component'),
    ph('S0311L01B02', 'he could not go', 'er konnte nicht gehen', 'build'),
    ph('S0311L04U01', 'he could not believe the three most important facts', 'er konnte die drei wichtigsten Fakten nicht glauben'),
    ph('S0311L04U07', "he couldn't believe the three most important facts", 'er konnte die drei wichtigsten Fakten nicht glauben'),
    ph('S0347L02B02', 'a week ago she could play', 'vor einer Woche konnte sie spielen', 'build'),
  ],
});
const only = (ids) => ROWS.filter((r) => ids.includes(r[0]));

test('THE RULE: konnte with no past marker in the English is a defect — seed 311 broke it before #489 and does not after', () => {
  const db = before();
  assert.deepStrictEqual(T.ruleDefects(db), ['seed:311', 'S0311L01', 'S0311L01B02', 'S0311L04U01', 'S0311L04U07']);
  const p = T.plan(db, only(['seed:311', 'S0311L01', 'S0311L01C01', 'S0311L01C02', 'S0311L01B02', 'S0311L04U01', 'S0311L04U07']));
  assert.deepStrictEqual(T.ruleDefects(T.simulate(db, p)), []);
  // a past marker ("a week ago") keeps konnte legal, and components are tiles, not sentences
  assert.strictEqual(T.konnteWithoutMarker({ known_text: 'a week ago she could play', target_text: 'vor einer Woche konnte sie spielen' }), false);
  assert.strictEqual(T.konnteWithoutMarker({ phrase_role: 'component', known_text: 'could not', target_text: 'konnte nicht' }), false);
});

test('S0311L01 grows to Kai\'s frame inside the 8-syllable cap, with components that tile it and an intro that quotes it', () => {
  const p = T.plan(before(), only(['S0311L01']));
  const l = p.legos[0];
  assert.deepStrictEqual(l.after, ["he said he couldn't", 'er hat gesagt, er konnte nicht']);
  assert.strictEqual(l.components.map((c) => c.target).join(' ').replace(/,/g, ''), l.after[1].replace(/,/g, ''));
  assert.ok(l.intro.includes(`'${l.after[0]}'`) && l.intro.includes("'he said he couldn't believe"));
  const syll = (s) => (s.toLowerCase().match(/[aeiouäöüy]+/g) || []).length;
  assert.ok(syll(l.after[1]) <= 8, `${l.after[1]} has ${syll(l.after[1])} syllables`);
});

test('ops pin every row (expect), link each changed slot in the same batch, and a LEGO or seed is never deleted', () => {
  const p = T.plan(before(), only(['seed:311', 'S0311L01', 'S0311L04U01']));
  const asks = T.clipAsks(p);
  const clips = new Map(asks.map((a, i) => [`${a.role}\u0000${a.text}${a.role === 'presentation' ? `\u0000${a.legoId || ''}` : ''}`, `clip-${i}`]));
  const ops = T.editOps(p, clips);
  assert.ok(ops.filter((o) => o.op !== 'audio.link').every((o) => o.expect));
  assert.deepStrictEqual(ops.filter((o) => o.op === 'audio.link' && o.target === 'seed').map((o) => o.slot), ['known', 'target1', 'target2']);
  assert.deepStrictEqual(ops.filter((o) => o.op === 'audio.link' && o.target === 'lego').map((o) => o.slot), ['known', 'target1', 'target2', 'presentation']);
  assert.ok(ops.some((o) => o.op === 'lego.update' && o.set.components));
  assert.deepStrictEqual(ops.filter((o) => o.op === 'phrase.delete').map((o) => o.phrase_id), ['deu_for_eng:S0311L04U01']);
  const comp = T.plan(before(), only(['S0311L01', 'S0311L01C01'])).phrases[0];
  assert.strictEqual(comp.intro, "The German for: 'he said', as in — 'he said he couldn't', is:");
  assert.throws(() => T.plan(before(), [['S0311L01', 1, 'delete', null, 'x', 'y']]), /never/);
  assert.throws(() => T.plan(before(), [['seed:311', 1, 'delete', null, 'x', 'y']]), /never/);
});

test('the data: every tranche-1 konnte row ends with a past marker, held items name seeds and a proposal', () => {
  for (const [id, tr, action, to] of ROWS) {
    if (action !== 'fix' || !to || !to[0] || !to[1]) continue;
    if (/\bkonnte/i.test(to[1])) assert.ok(T.PAST_MARKER.test(to[0]) || id.includes('C0'), `${id}: konnte without a past marker`);
  }
  for (const h of HELD) assert.ok(h.seeds.length && h.proposal, 'held item without seeds or proposal');
});
