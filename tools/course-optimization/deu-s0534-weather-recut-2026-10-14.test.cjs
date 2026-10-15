'use strict';
// Job #499: deu_for_eng seed 534 re-cut in build-up order (Kai, 2026-10-14) — weather · outside · go outside ·
// dreadful · in this dreadful weather; "in | bei" and "to | nach" no longer new LEGOs; every basket drills its own LEGO;
// "go outside" is nach draußen gehen downstream. The fixture is seed 534's LEGOs and the rows the plan names, as they
// stood live on 2026-10-14. Run: node --test <this file>
const test = require('node:test');
const assert = require('node:assert/strict');
const T = require('./deu-s0534-weather-recut-2026-10-14.cjs');

const C = 'deu_for_eng';
const lid = (s, i) => `S${String(s).padStart(4, '0')}L${String(i).padStart(2, '0')}`;
const L = (s, i, known, target, isNew = true, type = 'A') => ({ lego_id: lid(s, i), seed_number: s, lego_index: i, known_text: known, target_text: target, is_new: isNew, type, components: [] });
const Ph = (id, known, target) => ({ id: `${C}:${id}`, seed_number: +id.slice(1, 5), lego_index: +id.slice(6, 8), phrase_role: id[8] === 'B' ? 'build' : 'use', position: 1, known_text: known, target_text: target });

function preDump() {
  const legos = [
    L(534, 1, 'weather', 'Wetter'), L(534, 2, 'outside', 'draußen'), L(534, 3, 'in this dreadful weather', 'bei diesem schrecklichen Wetter', true, 'M'),
    L(534, 4, 'in', 'bei'), L(534, 5, 'dreadful', 'schrecklichen'), L(534, 6, 'to', 'nach', false), L(567, 2, 'outdoors', 'draußen'),
  ];
  const phrases = [...T.REWRITES, ...T.DELETES].map(([id, k, t]) => Ph(id, k, t));
  return { course: C, legos, phrases, seeds: [] };
}

test('the course as it stood on 2026-10-14 fails the ruling', () => {
  const pr = T.invariants(preDump());
  assert.ok(pr.some((p) => /seed 534 new LEGOs are/.test(p)));
  assert.ok(pr.some((p) => /S0534L04 "in \| bei" is still a new LEGO/.test(p)));
  assert.ok(pr.some((p) => /S0534L03U01 .* does not drill S0534L03/.test(p)), 'the "on this day" rows do not drill the M LEGO');
  assert.ok(pr.some((p) => /S0567L02U03 .*go outside without nach/.test(p)));
});

test('after the plan: build-up order, every basket drills its LEGO, go outside = nach draußen gehen', () => {
  const post = T.applyPlan(preDump());
  assert.deepEqual(T.invariants(post), []);
  const seed = post.legos.filter((l) => l.seed_number === 534 && l.is_new).sort((a, b) => a.lego_index - b.lego_index);
  assert.deepEqual(seed.map((l) => `${l.known_text} | ${l.target_text}`),
    ['weather | Wetter', 'outside | draußen', 'go outside | nach draußen gehen', 'dreadful | schrecklichen', 'in this dreadful weather | bei diesem schrecklichen Wetter']);
});

test('nothing before L05 says diesem (it is first taught by the M LEGO)', () => {
  for (const [id, , , , t] of T.REWRITES) if (/^S0534L0[34]/.test(id)) assert.ok(!/\bdiesem\b/.test(t), `${id}: ${t}`);
});

test('contractions are judged by their parts', () => {
  const firstK = new Map([['can', [7, 3]], ['not', [10, 1]], ['will', [94, 1]]]);
  assert.deepEqual(T.untaughtKnown("we can't", { seed_number: 534, lego_index: 5 }, new Map([...firstK, ['we', [18, 1]]])), []);
  assert.deepEqual(T.untaughtKnown("she won't", { seed_number: 534, lego_index: 3 }, new Map([...firstK, ['she', [17, 1]]])), []);
});

test('clips move with their words; only "go outside" needs new LEGO clips', () => {
  const lego = (id, k, t, ids) => ({ ...L(534, +id.slice(-1), k, t), lego_id: id, known_audio_id: ids[0], target1_audio_id: ids[1], target2_audio_id: ids[2], presentation_audio_id: ids[3] });
  const dump = { legos: [lego('S0534L03', 'x', 'y', ['a3k', 'a3t1', 'a3t2', 'a3p']), lego('S0534L05', 'x', 'y', ['a5k', 'a5t1', 'a5t2', 'a5p'])], phrases: [] };
  const ops = T.editOps(dump, {});
  const link = (l, s) => ops.find((o) => o.op === 'audio.link' && o.lego_id === l && o.slot === s)?.audio_id;
  assert.equal(link('S0534L04', 'known'), 'a5k');
  assert.equal(link('S0534L04', 'presentation'), 'a5p');
  assert.equal(link('S0534L05', 'target2'), 'a3t2');
  assert.equal(link('S0534L05', 'presentation'), 'a3p');
  assert.equal(link('S0534L03', 'known'), undefined, 'no clip until rendered');
  const legoReqs = T.slotRequests().filter((r) => r.target === 'lego');
  assert.deepEqual(legoReqs.map((r) => `${r.id}.${r.slot}`), ['S0534L03.known', 'S0534L03.target1', 'S0534L03.target2', 'S0534L03.presentation']);
  assert.equal(legoReqs[3].text, "The German for: 'go outside', is:");
});
