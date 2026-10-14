'use strict';
// Job #494: deu_for_eng "yet" — negative yet is noch nicht, positive yet is schon (Kai, 2026-10-14); S0519L04 not new
// and its drill rows rehomed (P25); S0519L02 "their new baby" basket drills the whole LEGO. The fixture is the rows the
// plan names, as they stood live on 2026-10-14, plus the LEGOs they sit under. Run: node --test <this file>
const test = require('node:test');
const assert = require('node:assert/strict');
const T = require('./deu-yet-noch-519-baby-2026-10-14.cjs');

const C = 'deu_for_eng';
const lid = (s, i) => `S${String(s).padStart(4, '0')}L${String(i).padStart(2, '0')}`;
const L = (s, i, known, target, isNew = true) => ({ lego_id: lid(s, i), seed_number: s, lego_index: i, known_text: known, target_text: target, is_new: isNew, type: 'A', components: [] });
const Ph = (id, known, target, position = 1) => ({ id: `${C}:${id}`, seed_number: +id.slice(1, 5), lego_index: +id.slice(6, 8), phrase_role: id[8] === 'B' ? 'build' : 'use', position, known_text: known, target_text: target });

function preDump() {
  const legos = [L(60, 1, 'yet', 'noch'), L(519, 2, 'their new baby', 'ihr neues Baby'), L(519, 4, 'yet', 'noch'),
    L(478, 1, 'she has', 'sie hat'), L(420, 3, 'he', 'er'), L(372, 2, 'tried', 'versucht'), L(517, 2, 'gone', 'gegangen'),
    L(629, 3, 'but', 'aber'), L(268, 2, 'sent', 'geschickt'), L(565, 1, 'about it', 'darüber')];
  const phrases = [
    Ph('S0519L04B01', 'yet', 'noch'),
    Ph('S0519L04B02', 'not yet', 'noch nicht'), Ph('S0519L04B03', 'she has not yet', 'sie hat noch nicht'),
    Ph('S0519L04U01', 'she has not tried yet', 'sie hat es noch nicht versucht'),
    Ph('S0519L04U03', 'he has not done it yet', 'er hat das noch nicht gemacht'),
    Ph('S0519L04U05', 'I have not tried yet', 'ich habe das noch nicht versucht'),
    Ph('S0519L04U06', 'she has not yet gone', 'sie ist noch nicht gegangen'),
    Ph('S0519L04U08', "they're not ready yet but they'll be ready soon", 'Sie sind noch nicht bereit, aber sie werden bald bereit sein'),
    ...T.DELETES.map(([id, k, t]) => Ph(id, k, t)),
    ...T.REWRITES.map(([id, k, t]) => Ph(id, k, t)),
    ...Object.entries(T.POSITIONS).map(([id, [a]]) => Ph(id, 'yet', 'noch', a)),
  ];
  // the four S0060L01 rows really say "not yet …"; their words do not matter to the rules under test
  for (const p of phrases) if (T.POSITIONS[p.id.slice(C.length + 1)]) { p.known_text = `not yet ${p.position}`; p.target_text = `noch nicht ${p.position}`; }
  return { course: C, legos, phrases, seeds: [] };
}

test('yet polarity: questions and plain statements are positive, any negation is negative', () => {
  assert.equal(T.yetPolarity('have you tried yet?'), 'positive');
  assert.equal(T.yetPolarity('has she come yet?'), 'positive');
  assert.equal(T.yetPolarity('she has not come yet'), 'negative');
  assert.equal(T.yetPolarity("I haven't seen their new baby yet"), 'negative');
  assert.equal(T.yetPolarity('nobody has seen it there yet'), 'negative');
  assert.equal(T.yetPolarity('she has tried'), null);
});

test('the course as it stood fails the rulings; the plan applied passes them', () => {
  const pre = preDump();
  const before = T.invariants(pre);
  assert.ok(before.some((x) => /positive yet not schon: S0519L04U02/.test(x)), before.join('\n'));
  assert.ok(before.some((x) => /negative yet without noch: S0268L02U03/.test(x)));
  assert.ok(before.some((x) => /S0519L04 still holds/.test(x)));
  assert.ok(before.some((x) => /S0519L02B01 does not drill/.test(x)));
  assert.ok(before.some((x) => /new "yet \| noch" LEGOs: S0060L01, S0519L04/.test(x)));
  assert.deepEqual(T.invariants(T.applyPlan(pre)), []);
});

test('moves keep the row and its clips under a new id from 21 up, never reusing a live id', () => {
  const post = T.applyPlan(preDump());
  const byFrom = new Map(post.inserts.map((i) => [i.from, i.row]));
  assert.equal(byFrom.get('S0519L04B02').id, `${C}:S0060L01B21`);
  assert.equal(byFrom.get('S0519L04B02').position, 1); // "not yet" leads the debut's builds
  assert.equal(byFrom.get('S0519L04B03').id, `${C}:S0478L01U21`);
  assert.equal(byFrom.get('S0519L04U01').id, `${C}:S0478L01U22`);
  assert.equal(byFrom.get('S0519L04U08').id, `${C}:S0629L03U21`);
  assert.equal(byFrom.get('S0519L04U08').metadata.moved_from, 'S0519L04U08');
});

test('ops: flip, positions, insert+delete per move, deletes, rewrites — all with expects', () => {
  const ops = T.textOps(preDump());
  assert.deepEqual(ops[0], { op: 'lego.update', lego_id: 'S0519L04', expect: { is_new: true }, set: { is_new: false } });
  assert.equal(ops.filter((o) => o.op === 'phrase.insert').length, T.MOVES.length);
  assert.equal(ops.filter((o) => o.op === 'phrase.delete').length, T.MOVES.length + T.DELETES.length);
  for (const o of ops.filter((x) => x.op !== 'phrase.insert')) assert.ok(o.expect, JSON.stringify(o));
  const k268 = ops.find((o) => o.phrase_id === `${C}:S0268L02U03`);
  assert.deepEqual(Object.keys(k268.set), ['known_text']); // German untouched → its clips stay
});

test('only the changed sides ask for audio', () => {
  const r = T.slotRequests();
  assert.equal(r.filter((x) => x.phrase_id.endsWith('S0268L02U03')).map((x) => x.role).join(), 'known');
  assert.equal(r.filter((x) => x.phrase_id.endsWith('S0519L02U01')).map((x) => x.role).join(), 'known,target1,target2');
  assert.deepEqual(T.linkOps({ 'known|their new baby': 'a1' }), [{ op: 'audio.link', target: 'phrase', phrase_id: `${C}:S0519L02B01`, slot: 'known', audio_id: 'a1' }]);
});
