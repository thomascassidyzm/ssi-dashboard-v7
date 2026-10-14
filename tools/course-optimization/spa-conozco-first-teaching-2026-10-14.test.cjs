'use strict';
// node tools/course-optimization/spa-conozco-first-teaching-2026-10-14.test.cjs — the conozco case (job #412)
const assert = require('assert');
const T = require('./p26-early-placement-sweep-2026-10-06.cjs');
const M = require('./spa-conozco-first-teaching-2026-10-14.cjs');
const L = (seed, i, isNew, known, target) => ({ lego_id: `S${String(seed).padStart(4, '0')}L0${i}`, seed_number: seed, lego_index: i, is_new: isNew, known_text: known, target_text: target });
const P = (id, known, target, role = 'use', position = 1) => ({ id: `spa_for_eng:${id}`, course_code: 'spa_for_eng', seed_number: Number(id.slice(1, 5)), lego_index: Number(id.slice(6, 8)), position, phrase_role: role, known_text: known, target_text: target, metadata: {} });
const dump = {
  course: 'spa_for_eng',
  legos: [L(85, 1, false, 'I know', 'conozco'), L(85, 2, true, 'those people', 'esas personas'), L(5, 3, true, 'to', 'a'), L(228, 1, true, 'that man', 'ese hombre'), L(230, 1, true, 'I know', 'conozco')],
  phrases: [
    P('S0085L02U01', "I don't know those people yet", 'No conozco a esas personas todavía'),
    P('S0230L01B02', 'I know that man', 'Conozco a ese hombre', 'build', 2),
  ],
};
// the bug: with S0085L01 not new, conozco is "first taught" at 230 only because the detector now ignores not-new LEGOs …
assert.deepStrictEqual(T.firstIntro(dump.legos).get('conozco'), [230, 1]);
// … and after the fix it is first taught at 85
const fixed = M.plan(dump, { legoFlips: { S0085L01: true, S0230L01: false }, moves: { S0230L01B02: { to: 'S0228L01', role: 'use' } } });
assert.deepStrictEqual(fixed.problems, []);
assert.deepStrictEqual(fixed.ops.filter((o) => o.op === 'lego.update').map((o) => [o.lego_id, o.set.is_new]), [['S0085L01', true], ['S0230L01', false]]);
assert.deepStrictEqual(fixed.moved.map((m) => [m.from, m.to, m.role]), [['S0230L01B02', 'S0228L01U01', 'use']]);
// every insert is paired with a delete of the old id, and keeps the text
assert.strictEqual(fixed.ops.filter((o) => o.op === 'phrase.insert').length, fixed.ops.filter((o) => o.op === 'phrase.delete').length);
// a phrase that would use a word untaught at its destination is refused: seed 85 does not teach "ese hombre"
const early = M.plan(dump, { legoFlips: { S0085L01: true, S0230L01: false }, moves: { S0230L01B02: { to: 'S0085L01' } } });
assert.ok(early.problems[0].includes('before it is taught') || early.problems[0].includes('does not contain'), early.problems[0]);
// a destination that is not new is refused (P25)
assert.ok(M.plan(dump, { legoFlips: {}, moves: { S0230L01B02: { to: 'S0085L01' } } }).problems[0].includes('not a NEW LEGO'));
// the authored basket for the new debut: words taught by 85 pass; "ese hombre" (taught at 228) is refused; the bare 85L02 word "esas" is refused
const L85 = [...dump.legos, L(5, 4, true, 'with someone else', 'con otra persona'), L(1, 1, true, 'I want', 'quiero')];
const auth = (known, target) => M.plan({ ...dump, legos: L85 }, { legoFlips: { S0085L01: true }, moves: {}, authored: [{ lego: 'S0085L01', role: 'use', known, target }] });
assert.deepStrictEqual(auth('I know someone else', 'Conozco a otra persona').problems, []);
assert.ok(auth('I know that man', 'Conozco a ese hombre').problems[0].includes('untaught'));
assert.ok(auth("I don't know those people", 'No conozco a esas personas').problems[0].includes('untaught'));
// the real move table has a home for every S0230L01 drill phrase and for none of the bare LEGO row
assert.ok(!('S0230L01B01' in M.MOVES_SPA));
console.log('ok');
