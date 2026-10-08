#!/usr/bin/env node
/**
 * The v3 phrase generator judges "already taught" by the course's RUNNING ORDER (job #949),
 * not by seed number. Shape taken from cym_nv2_for_eng: a Hadau Creiddiol block (ids 1000+N)
 * plays after old seed 137, so for block seed 1003 the old seeds 1-137 and block seeds
 * 1001-1002 are taught, and old seed 140 — lower id, but played AFTER the block — is not.
 *
 * Covers the three reads the generator makes: the inventory it prompts with
 * (tools/phrase-lab/inventory.cjs), the vocabulary the gate checks against
 * (tools/phrase-gate/gate-check.cjs) and the frame-layer corpus (tools/frame-layer/corpus.cjs).
 *
 * Usage: node tools/phrase-lab/running-order.test.cjs
 */
const assert = require('assert');
const { buildInventory } = require('./inventory.cjs');
const { loadTranslationVocab } = require('../phrase-gate/gate-check.cjs');
const { loadCorpus } = require('../frame-layer/corpus.cjs');

const C = 'cym_nv2_for_eng';
const lego = (seed, idx, known, target) => ({
  lego_id: `S${String(seed).padStart(4, '0')}L${String(idx).padStart(2, '0')}`,
  course_code: C, seed_number: seed, lego_index: idx, type: 'A', is_new: true, known_text: known, target_text: target, components: null,
});
const TABLES = {
  course_legos: [
    lego(1, 1, 'I want', 'dw i isio'),
    lego(137, 1, 'now', 'rŵan'),
    lego(140, 1, 'tomorrow', 'fory'),        // old seed played AFTER the block
    lego(1001, 1, 'to learn', 'dysgu'),
    lego(1002, 1, 'every day', 'bob dydd'),
    lego(1003, 1, 'quickly', 'yn gyflym'),
  ],
  course_seeds: [1, 137, 140, 1001, 1002, 1003].map((n) => ({ course_code: C, seed_number: n, known_text: `s${n}`, target_text: `hedyn${n}` })),
  course_practice_phrases: [],
  course_running_order: [1, 137, 1001, 1002, 1003, 140].map((n, i) => ({ course_code: C, seed_number: n, position: i + 1 })),
};

// Minimal PostgREST stand-in that honours eq / in / lt / lte, so a filter the code forgets
// to apply shows up as a row that should not be there.
function fakeSupabase() {
  return {
    from(table) {
      let rows = [...(TABLES[table] || [])];
      const q = {
        select: () => q, order: () => q, not: () => q,
        eq: (k, v) => { rows = rows.filter((r) => r[k] === v); return q; },
        in: (k, vs) => { rows = rows.filter((r) => vs.includes(r[k])); return q; },
        lt: (k, v) => { rows = rows.filter((r) => r[k] < v); return q; },
        lte: (k, v) => { rows = rows.filter((r) => r[k] <= v); return q; },
        range: async () => ({ data: rows, error: null }),
        maybeSingle: async () => ({ data: rows[0] || null, error: null }),
        then: (res, rej) => Promise.resolve({ data: rows, error: null }).then(res, rej),
      };
      return q;
    },
  };
}

(async () => {
  const inv = await buildInventory(fakeSupabase(), C, 1003, 1);
  const taught = inv.items.map((i) => i.seedNumber).sort((a, b) => a - b);
  assert.deepStrictEqual(taught, [1, 137, 1001, 1002], `inventory for 1003 should be 1,137,1001,1002 — got ${taught}`);

  const vocab = await loadTranslationVocab(fakeSupabase(), C, 1003);
  assert.ok(vocab.has('dysgu'), 'block seed 1001 is taught before 1003');
  assert.ok(!vocab.has('fory'), 'old seed 140 plays after the block — not taught before 1003');

  const corpus = await loadCorpus(fakeSupabase(), C, 1003);
  assert.deepStrictEqual(corpus.priorLegos.map((l) => l.seed_number).sort((a, b) => a - b), [1, 137, 1001, 1002]);
  assert.deepStrictEqual(corpus.priorSeeds.map((s) => s.seed_number).sort((a, b) => a - b), [1, 137, 1001, 1002]);

  // A course without a running order keeps the seed_number rule (also inventory.test.cjs).
  delete TABLES.course_running_order;
  const plain = await buildInventory(fakeSupabase(), C, 1003, 1);
  assert.deepStrictEqual(plain.items.map((i) => i.seedNumber).sort((a, b) => a - b), [1, 137, 140, 1001, 1002]);

  console.log('running-order.test: 4 passed');
})().catch((e) => { console.error('FAIL', e.message); process.exit(1); });
