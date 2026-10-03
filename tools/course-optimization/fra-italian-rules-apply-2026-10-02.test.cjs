'use strict';
// Proves job #355's pass on fra_for_eng: on the PRE-fix picture of five real rows the plan proposes exactly the
// Italian-ruled fix for each (P26 insert, K41 "to", P27 delete, K32 monsieur/madame, seed 60's "pas encore"), and on the
// POST-fix picture it proposes nothing. The ZUT gate drops (and holds) a K32 edit that would make a BUILD differ from
// its own LEGO over the same English — the S0646L01B01 shape.
const test = require('node:test');
const assert = require('node:assert');
const T = require('./fra-italian-rules-apply-2026-10-02.cjs');

const legos = [
  { lego_id: 'S0052L03', seed_number: 52, lego_index: 3, is_new: true, known_text: 'letter', target_text: 'lettre' },
  { lego_id: 'S0060L01', seed_number: 60, lego_index: 1, is_new: true, known_text: 'yet', target_text: 'encore' },
  { lego_id: 'S0102L03', seed_number: 102, lego_index: 3, is_new: true, known_text: 'like that', target_text: 'comme ça' },
  { lego_id: 'S0645L01', seed_number: 645, lego_index: 1, is_new: true, known_text: 'I can help you madam', target_text: 'je peux vous aider madame' },
  { lego_id: 'S0646L01', seed_number: 646, lego_index: 1, is_new: true, known_text: 'you are doing sir', target_text: 'vous faites' },
];
const seeds = [
  { seed_number: 52, known_text: 'a letter', target_text: 'une lettre' },
  { seed_number: 60, known_text: "I don't know yet", target_text: 'je ne sais pas encore' },
  { seed_number: 102, known_text: 'like that', target_text: 'comme ça' },
  { seed_number: 645, known_text: 'I can help you madam', target_text: 'je peux vous aider madame' },
  { seed_number: 646, known_text: 'you are doing sir', target_text: 'vous faites' },
];
const row = (id, role, k, t) => ({ id: `fra_for_eng:${id}`, seed_number: Number(id.slice(1, 5)), lego_index: Number(id.slice(6, 8)), position: 1, phrase_role: role, known_text: k, target_text: t });
const base = [
  row('S0052L03U01', 'use', 'a letter', 'une lettre'),
  row('S0060L01U01', 'use', "I don't know yet", 'je ne sais pas encore'),
  row('S0102L03U01', 'use', 'like that', 'comme ça'),
  row('S0645L01U01', 'use', 'I can help you madam', 'je peux vous aider madame'),
  row('S0646L01U01', 'use', 'you are doing sir', 'vous faites'),
];
const PRE = [
  ...base,
  row('S0052L03B03', 'build', 'write a letter', 'écrire une lettre'),
  row('S0060L01U03', 'use', "I'm not ready yet", 'je ne suis pas prêt encore'),
  row('S0102L03U02', 'use', 'she said it like that yesterday', "elle l'a dit comme ça hier"),
  row('S0645L01U03', 'use', 'yes I can help you madam', 'oui je peux vous aider'),
  row('S0646L01B01', 'build', 'you are doing sir', 'vous faites'),
];
const POST = [
  ...base,
  row('S0052L03B03', 'build', 'to write a letter', 'écrire une lettre'),
  row('S0060L01U03', 'use', "I'm not ready yet", 'je ne suis pas encore prêt'),
  row('S0645L01U03', 'use', 'yes I can help you madam', 'oui je peux vous aider madame'),
  row('S0646L01B01', 'build', 'you are doing sir', 'vous faites'),
];
const run = (phrases) => { const db = { seeds, legos, phrases }; const p = T.plan(db); p.zut = T.zutGate(db, p); return p; };

test('pre-fix: each Italian-ruled fix is proposed', () => {
  const p = run(PRE);
  const ed = Object.fromEntries(p.edits.map((e) => [e.id, e.after]));
  assert.deepStrictEqual(ed.S0052L03B03, ['to write a letter', 'écrire une lettre']);
  assert.deepStrictEqual(ed.S0060L01U03, ["I'm not ready yet", 'je ne suis pas encore prêt']);
  assert.deepStrictEqual(ed.S0645L01U03, ['yes I can help you madam', 'oui je peux vous aider madame']);
  assert.ok(p.deletes.some((d) => d.id === 'S0102L03U02'));
  assert.ok(!('S0646L01B01' in ed), 'B01 equal to its LEGO must not drift from it');
  assert.ok(p.held.some((h) => h.id === 'S0646L01B01' && /ZUT/.test(h.why)));
  assert.ok(p.zut.after <= p.zut.before);
});

test('post-fix: nothing left to do', () => {
  const p = run(POST);
  assert.deepStrictEqual(p.edits.map((e) => e.id).filter((id) => ['S0052L03B03', 'S0060L01U03', 'S0645L01U03'].includes(id)), []);
  assert.ok(!p.deletes.some((d) => d.id === 'S0102L03U02'));
});

test('honorific goes before the French question mark', () => {
  assert.strictEqual(T.addHonorific('êtes-vous prêt maintenant ?', 'monsieur'), 'êtes-vous prêt maintenant monsieur ?');
  assert.strictEqual(T.addHonorific('vous faites beaucoup', 'monsieur'), 'vous faites beaucoup monsieur');
});
