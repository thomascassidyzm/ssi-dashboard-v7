'use strict';
// node --test tools/course-optimization/k26-person-pronoun-2026-10-22.test.cjs
// Job #531 (canon K26 + K28). No DB. Pins the rule on the rows as they stood BEFORE the pass (every `from` names nobody, so the
// pre-fix text fails namesPerson) and on the planner's guards, using a small hand-made course.
const test = require('node:test');
const assert = require('node:assert/strict');
const K = require('./k26-person-pronoun-2026-10-22.cjs');
const DATA = require('./k26-person-pronoun-2026-10-22.data.cjs');

test('K26: every edited LEGO named nobody before and names a person after (fails on the pre-fix text)', () => {
  let n = 0;
  for (const [course, d] of Object.entries(DATA)) {
    for (const [id, from, to] of d.edits) {
      n++;
      assert.equal(K.namesPerson(from), false, `${course} ${id} "${from}" already named a person`);
      assert.equal(K.namesPerson(to), true, `${course} ${id} "${to}" still names nobody`);
    }
  }
  assert.ok(n > 100);
});

function mini(over = {}) {
  const l = (lego_id, seed_number, lego_index, known_text, target_text, extra = {}) => ({ lego_id, seed_number, lego_index, known_text, target_text, is_new: true, components: [], ...extra });
  const p = (id, seed_number, lego_index, known_text, target_text, extra = {}) => ({ id: `c:${id}`, seed_number, lego_index, known_text, target_text, phrase_role: 'build', updated_at: '2026-10-01T00:00:00Z', ...extra });
  return {
    seeds: [{ seed_number: 1, target_text: 'eu esperava', approved_at: '2026-04-01T00:00:00Z' }, { seed_number: 2, target_text: 'ela fala', approved_at: null }],
    legos: [l('S0001L01', 1, 1, 'was hoping', 'esperava'), l('S0002L01', 2, 1, 'speaks', 'fala')],
    phrases: [p('S0001L01B01', 1, 1, 'was hoping', 'esperava'), p('S0001L01B02', 1, 1, 'I was hoping', 'eu esperava'), p('S0002L01B01', 2, 1, 'speaks', 'fala', over.recent ? { updated_at: '2026-10-22T20:00:00Z' } : {})]
      .map((x) => ({ updated_at: '2026-10-01T00:00:00Z', ...x })),
  };
}
const now = new Date('2026-10-22T20:30:00Z').getTime();
const rows = [['S0001L01', 'was hoping', 'I was hoping', null, { S0001L01B01: ['was hoping', 'I was hoping'] }], ['S0002L01', 'speaks', 'she speaks', null, { S0002L01B01: ['speaks', 'she speaks'] }]];

test('planner: a pronoun that would give one English two targets is HELD, a clean one is applied', () => {
  const db = mini();
  const { ready, skipped } = K.resolve(db, 'c', rows, now);
  assert.equal(skipped.length, 0);
  const g = K.guardZut(db, ready);
  assert.deepEqual(g.held.map((u) => u.lego_id), ['S0001L01']); // "I was hoping | esperava" vs "I was hoping | eu esperava"
  assert.deepEqual(g.live.map((u) => u.lego_id), ['S0002L01']);
  const ops = K.buildOps(db, g.live);
  assert.deepEqual(ops.map((o) => o.op), ['lego.update', 'phrase.update']); // seed 2 was not approved: nothing to unapprove
  assert.equal(ops[0].set.known_text, 'she speaks');
});

test('planner: a row changed in the last hour (job #530·V) is skipped, never edited over', () => {
  const { ready, skipped } = K.resolve(mini({ recent: true }), 'c', rows, now);
  assert.deepEqual(skipped.map((u) => u.lego_id), ['S0002L01']);
  assert.ok(/last hour/.test(skipped[0].why));
  assert.deepEqual(ready.map((u) => u.lego_id), ['S0001L01']);
});

test('planner: drift (the live text is not what the reader saw) skips the unit', () => {
  const db = mini(); db.legos[1].known_text = 'speaks well';
  const { skipped } = K.resolve(db, 'c', rows, now);
  assert.ok(skipped.some((u) => u.lego_id === 'S0002L01' && /now reads/.test(u.why)));
});
