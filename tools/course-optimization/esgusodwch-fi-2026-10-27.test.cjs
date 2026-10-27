'use strict';
// node --test tools/course-optimization/esgusodwch-fi-2026-10-27.test.cjs
// The job #139 apply tool on a hand-built North course: Aran's own wording beats the draft, a removed phrase is
// deleted, an accepted draft that no longer holds its own-worded LEGO is HELD, and a LEGO he deleted is held while a
// phrase he left unchanged still sits under it (its other removed phrases still go).
const test = require('node:test');
const assert = require('node:assert');
const { plan } = require('./esgusodwch-fi-2026-10-27.cjs');

const C = 'cym_nv2_for_eng';
const L = (id, known, target, extra = {}) => ({ lego_id: id, seed_number: Number(id.slice(1, 5)), lego_index: Number(id.slice(6, 8)), known_text: known, target_text: target, type: 'A', is_new: true, components: null, ...extra });
const P = (id, role, known, target) => ({ id: `${C}:${id}`, phrase_role: role, known_text: known, target_text: target, seed_number: Number(id.slice(1, 5)), lego_index: Number(id.slice(6, 8)), position: 1 });
const decomposer = { decomposeAnchored: (t) => ({ kind: 'exact', blocks: [{ target: t }] }) };
const position = { computeLegoPosition: () => 'start' };

const db = {
  seeds: [
    { seed_number: 1642, known_text: 'how do you feel madam?', target_text: 'sut dach chi’n teimlo madam?' },
    { seed_number: 1647, known_text: 'you speak it madam', target_text: 'dach chi’n siarad hi madam' },
  ],
  legos: [
    L('S1642L03', 'madam', 'madam'),
    L('S1647L01', 'you speak it madam', 'dach chi’n siarad hi madam', { type: 'M', components: [{ known: 'you speak it madam', target: 'dach chi’n siarad hi madam' }] }),
  ],
  phrases: [
    P('S1642L03B01', 'build', 'please madam', 'os gwelwch yn dda madam'),
    P('S1642L03U01', 'use', 'but madam it’s so late', 'ond madam mae hi mor hwyr'),
    P('S1647L01B01', 'build', 'now you speak it madam', 'rŵan dach chi’n siarad hi madam'),
    P('S1647L01B03', 'build', 'you speak it madam I’m trying', 'dach chi’n siarad hi madam dw i’n trio'),
    P('S1647L01U01', 'use', 'you speak it madam I’m tired', 'dach chi’n siarad hi madam dw i wedi blino'),
  ],
};
const drafts = [
  'seed:1647\texcuse me, do you speak it?\tesgusodwch fi, dach chi’n siarad hi?',
  'lego:S1642L03\tDEL\t',
  'lego:S1647L01\texcuse me, do you speak it?\tesgusodwch fi, dach chi’n siarad hi?',
  'S1642L03B01\tDEL\t', 'S1642L03U01\tDEL\t',
  'S1647L01B01\texcuse me, do you speak it?\tesgusodwch fi, dach chi’n siarad hi?',
  'S1647L01B03\texcuse me, do you speak it? I’m trying\tesgusodwch fi, dach chi’n siarad hi? dw i’n trio',
  'S1647L01U01\texcuse me, do you speak it? I’m tired\tesgusodwch fi, dach chi’n siarad hi? dw i wedi blino',
].join('\n');

test('own wording, removal, containment hold and leftover hold follow the ruling', () => {
  const p = plan(C, db, drafts, { decomposer, position });
  const op = (name, key) => p.ops.find((o) => o.op === name && (o.phrase_id === `${C}:${key}` || o.lego_id === key || o.seed_number === key));
  // own wording (straight apostrophes written curly; the English seed keeps the straight one)
  assert.strictEqual(op('seed.update', 1647).set.target_text, 'esgusodwch fi, dach chi’n siarad Cymraeg?');
  assert.strictEqual(op('lego.update', 'S1647L01').set.target_text, 'esgusodwch fi, dach chi’n siarad Cymraeg?');
  assert.strictEqual(op('phrase.update', 'S1647L01U01').set.known_text, 'excuse me, do you speak Welsh? I’m trying, but I’m tired');
  // removed
  assert.ok(op('phrase.delete', 'S1647L01B03'));
  // accepted draft "siarad hi" cannot sit under the own-worded LEGO → held, untouched
  assert.ok(!op('phrase.update', 'S1647L01B01'));
  assert.ok(p.held.find((h) => h.id === 'S1647L01B01' && /containment/.test(h.why)));
  // S1642L03U01 left unchanged → its LEGO cannot go; B01 still goes
  assert.ok(!p.ops.find((o) => o.op === 'lego.delete'));
  assert.ok(p.held.find((h) => h.id === 'lego:S1642L03' && /S1642L03U01/.test(h.why)));
  assert.ok(op('phrase.delete', 'S1642L03B01'));
  assert.ok(!op('phrase.delete', 'S1642L03U01'));
  // 'excuse me' reference LEGO goes into seed 1642 after what is there
  assert.ok(p.ops.find((o) => o.op === 'lego.insert' && o.row.seed_number === 1642 && o.row.lego_index === 4 && o.row.is_new === false));
});
