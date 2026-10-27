'use strict';
// node --test tools/course-optimization/spa-105-152-clear-fixes-2026-10-27.test.cjs
// The gates that decide whether a verdict is written or held, on fixtures shaped like the live rows they were built for.
const test = require('node:test');
const assert = require('node:assert');
const T = require('./spa-105-152-clear-fixes-2026-10-27.cjs');

const lego = (lego_id, known_text, target_text, components = null) => ({ lego_id, seed_number: +lego_id.slice(1, 5), lego_index: +lego_id.slice(6, 8), known_text, target_text, components, is_new: true });
const ph = (id, known_text, target_text, phrase_role = 'use') => ({ id: `spa_for_eng:${id}`, seed_number: +id.slice(1, 5), known_text, target_text, phrase_role });
const db = () => ({
  seeds: [],
  legos: [lego('S0072L01', "you're doing it", 'lo estás haciendo'), lego('S0112L04', 'that was very interesting', 'eso fue muy interesante'), lego('S0124L01', 'I thought', 'pensé'), lego('S0132L03', 'than what', 'que lo que'), lego('S0118L04', 'better than', 'mejor de lo que')],
  phrases: [
    ph('S0112L04U09', "I thought that was very interesting", 'Pienso que eso fue muy interesante'),
    ph('S0112L04B06', 'I thought it was so interesting', 'Pensé que eso fue muy interesante', 'build'),
    ph('S0132L03B02', 'Better than what I expected', 'Mejor que lo que esperaba', 'build'),
    ph('S0072L01U01', 'I think that was very interesting', 'Pienso que eso fue muy interesante'),
  ],
});
const v = (id, was, to) => ({ id, act: 'fix', cls: 'X', was, to, why: 'fixture' });

test('a fix that ADDS a word not yet taught at its LEGO is held (pensé is S0124, the row is S0112)', () => {
  const p = T.plan(db(), [v('S0112L04U09', ['I thought that was very interesting', 'Pienso que eso fue muy interesante'], [null, 'Pensé que eso fue muy interesante'])]);
  assert.strictEqual(p.phrases.length, 0);
  assert.deepStrictEqual([p.held[0].rule, p.held[0].why], ['P1', 'untaught at S0112L04: pensé']);
});

test('a fix that would stop a row containing its LEGO is held (que lo que → de lo que under "than what")', () => {
  const p = T.plan(db(), [v('S0132L03B02', ['Better than what I expected', 'Mejor que lo que esperaba'], ['Better than I expected', 'Mejor de lo que esperaba'])]);
  assert.strictEqual(p.held[0].rule, 'P17');
});

test('a row that no longer reads as it did when the verdict was written is skipped, never written', () => {
  const p = T.plan(db(), [v('S0112L04U09', ['something else', 'otra cosa'], ['I think that was very interesting', null])]);
  assert.strictEqual(p.phrases.length, 0);
  assert.match(p.skipped[0].why, /changed since it was read/);
});

test('ZUT: an English that would gain a second Spanish is held; an English-side fix onto an existing pair passes', () => {
  const d = db();
  // B06 → the English U09 already pairs with Pienso: "I thought…" would stand over Pensé AND Pienso
  const p = T.plan(d, [v('S0112L04B06', ['I thought it was so interesting', 'Pensé que eso fue muy interesante'], ['I thought that was very interesting', null])]);
  T.zutGate(d, p);
  assert.strictEqual(p.phrases.length, 0);
  assert.strictEqual(p.held[0].rule, 'K2');
  // U09 → "I think…", which U01 already pairs with the same Pienso: no new clash, so it is written
  const ok = T.plan(d, [v('S0112L04U09', ['I thought that was very interesting', 'Pienso que eso fue muy interesante'], ['I think that was very interesting', null])]);
  T.zutGate(d, ok);
  assert.strictEqual(ok.phrases.length, 1);
});

test('a re-record refusal yields the named clip only when it is in the slot\'s cast voice', () => {
  const body = (voice) => ({ ok: false, code: 'RERECORD_NOT_PERMITTED', error: `TTS door (403) RERECORD_NOT_PERMITTED: spa_for_eng target1 "x" already has a working clip (c6c1313d-e560-40a0-84ba-50391f0775c0 in ${voice}). Re-recording needs…` });
  assert.strictEqual(T.existingClip(body('es-ES-ElviraNeural'), 'target1'), 'c6c1313d-e560-40a0-84ba-50391f0775c0');
  assert.strictEqual(T.existingClip(body('es-ES-ElviraNeural'), 'target2'), null);
  assert.strictEqual(T.existingClip({ ok: false, code: 'DAILY_TOTAL_CAP', error: 'cap' }, 'target1'), null);
});

test('every live verdict in the data file has the shape the tool reads, and none touches a LEGO, seed or component', () => {
  const data = require('./spa-105-152-clear-fixes-2026-10-27.data.cjs');
  for (const d of data) {
    assert.match(d.id, /^S01(0[5-9]|[1-4]\d|5[0-2])L\d\d[BU]\d\d$/, d.id);
    assert.ok(['fix', 'delete'].includes(d.act), d.id);
    assert.ok(Array.isArray(d.was) && d.was.length === 2, d.id);
    if (d.act === 'fix') assert.ok(d.to && (d.to[0] !== null || d.to[1] !== null), d.id);
  }
});
