'use strict';
// node --test tools/course-optimization/spa-held-49-2026-10-30.test.cjs
// Kai's ruling (30 Oct): nothing that re-cuts a LEGO or changes a seed's own sentence is applied by this tool, and a
// proposal that would drop the LEGO from the phrase is deleted rather than reworded.
const test = require('node:test');
const assert = require('node:assert');
const { plan, DECISIONS, HELD } = require('./spa-held-49-2026-10-30.cjs');

test('no held row is in DECISIONS', () => {
  const ids = new Set(DECISIONS.map((d) => d[0]));
  for (const [item, rows] of Object.entries(HELD)) for (const r of rows) assert.ok(!ids.has(r), `${r} (item ${item}) is held but would be edited`);
});

test('a reword that drops the LEGO becomes a delete; a delete under the floor is reported, not done', () => {
  const lego = { lego_id: 'S0044L01', seed_number: 44, lego_index: 1, known_text: 'or', target_text: 'o', components: [] };
  const mk = (id, role, k, t) => ({ id: `spa_for_eng:${id}`, phrase_role: role, known_text: k, target_text: t });
  const db = {
    seeds: [{ seed_number: 44, known_text: 'x', target_text: 'x', approved_at: null }],
    legos: [lego],
    phrases: [mk('S0044L01B01', 'build', 'To speak or learn', 'Hablar o aprender'),
      mk('S0044L01U05', 'use', "She doesn't want to learn or speak tonight", 'Ella no quiere aprender o hablar esta noche'),
      mk('S0044L01U01', 'use', 'a', 'a'), mk('S0044L01U02', 'use', 'b', 'b'), mk('S0044L01U03', 'use', 'c', 'c'), mk('S0044L01U04', 'use', 'd', 'd')],
  };
  const p = plan(db, { tw: require('../../services/course-builder/lib/taught-words.cjs') });
  assert.deepStrictEqual(p.deleted.map((d) => d.id), ['S0044L01U05']); // five USE, one goes: four stay
  db.phrases.pop();
  const q = plan(db);
  assert.deepStrictEqual(q.deleteBlocked.map((d) => d.id), ['S0044L01U05']); // would leave three USE
});
