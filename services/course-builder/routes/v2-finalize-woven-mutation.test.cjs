// v2 decompose finalize decides "already taught" (is_new) the way the Welsh course always has
// (Aran, 2026-10-07): by RUNNING ORDER in a woven course (job #949 — HC block seeds 1001+ play
// after old seed 137, so old 138+ is not their history), and with a soft-mutated form of a taught
// LEGO counting as taught (Cymraeg taught => Gymraeg is not new; medra/fedra).
//
// Run: npx vitest run services/course-builder/routes/v2-finalize-woven-mutation

import { describe, it, expect } from 'vitest'

const { isSoftMutationVariant } = require('../lib/welsh-mutation.cjs');

function makeSupabase(rows) {
  const writes = [];
  function builder(table) {
    const b = {
      then(resolve, reject) {
        const data = rows[table] || [];
        return Promise.resolve({ data: b._single ? (data[0] || null) : data, error: null }).then(resolve, reject);
      },
    };
    for (const m of ['select', 'eq', 'neq', 'in', 'lt', 'lte', 'gt', 'gte', 'not', 'is',
                     'order', 'limit', 'range', 'filter', 'match', 'or', 'delete']) b[m] = () => b;
    b.single = b.maybeSingle = () => { b._single = true; return b; };
    for (const m of ['insert', 'upsert', 'update']) {
      b[m] = (payload) => { writes.push({ table, op: m, rows: Array.isArray(payload) ? payload : [payload] }); return b; };
    }
    return b;
  }
  return { from: builder, rpc: async () => ({ data: null, error: null }), _writes: writes };
}

function handlerFor(router, method, path) {
  for (const layer of router.stack) {
    const route = layer.route;
    if (route && route.path === path && route.methods[method.toLowerCase()]) return route.stack[route.stack.length - 1].handle;
  }
  throw new Error(`no handler for ${method} ${path}`);
}

async function finalize(rows, courseCode) {
  const ctx = { supabase: makeSupabase(rows), courseVocabCache: new Map(), config: {} };
  const handler = handlerFor(require('./v2.cjs')(ctx), 'POST', '/v2/decompose/finalize/:courseCode');
  const res = { statusCode: 200, body: null };
  res.status = (c) => { res.statusCode = c; return res; };
  res.json = (b) => { res.body = b; return res; };
  await handler({ params: { courseCode }, body: {}, headers: {} }, res);
  const legos = ctx.supabase._writes.filter(w => w.table === 'course_legos' && w.op === 'upsert').flatMap(w => w.rows);
  return { res, isNew: Object.fromEntries(legos.map(l => [`${l.seed_number}:${l.known_text}`, l.is_new])) };
}

const C = 'cym_tst_for_eng';
const draft1001 = {
  course_code: C, seed_number: 1001, known_text: 'a shop that speaks Welsh', target_text: 'siop sy’n siarad Gymraeg',
  validation_status: 'valid',
  submission_data: { legos: [
    { idx: 1, type: 'A', known: 'a shop', target: 'siop' },
    { idx: 2, type: 'A', known: 'Welsh', target: 'Gymraeg' },
  ] },
};
const baseline = [
  { known_text: 'Welsh', target_text: 'Cymraeg', seed_number: 1, lego_index: 1, is_new: true },   // plays before the block
  { known_text: 'a shop', target_text: 'siop', seed_number: 258, lego_index: 1, is_new: true },    // old seed that plays AFTER it
];
const order = [ { seed_number: 1, position: 1 }, { seed_number: 1001, position: 2 }, { seed_number: 258, position: 3 } ];

describe('v2 finalize in a woven Welsh course', () => {
  it('a soft-mutated form of a LEGO taught earlier is not new (and is not a ZUT collision)', async () => {
    const { res, isNew } = await finalize({ course_seed_drafts: [draft1001], course_legos: baseline, course_running_order: order }, C);
    expect(res.statusCode).toBe(200);
    expect(isNew['1001:Welsh']).toBe(false);
    expect(res.body.mutation_duplicates).toEqual([expect.objectContaining({ seed_number: 1001, target: 'Gymraeg', taught_as: 'Cymraeg' })]);
  });

  it('a LEGO that only a LATER seed in the running order teaches is new here', async () => {
    const { isNew } = await finalize({ course_seed_drafts: [draft1001], course_legos: baseline, course_running_order: order }, C);
    expect(isNew['1001:a shop']).toBe(true);
  });

  it('a fork with a later seed is still a ZUT collision', async () => {
    const forked = [baseline[0], { ...baseline[1], target_text: 'siopa' }];
    const { res } = await finalize({ course_seed_drafts: [draft1001], course_legos: forked, course_running_order: order }, C);
    expect(res.statusCode).toBe(409);
  });

  it('a course with no running order and no Welsh target behaves as before (mutation is a collision)', async () => {
    const d = { ...draft1001, course_code: 'tst_for_eng' };
    const { res } = await finalize({ course_seed_drafts: [d], course_legos: baseline, course_running_order: [] }, 'tst_for_eng');
    expect(res.statusCode).toBe(409);
  });
});

describe('isSoftMutationVariant', () => {
  it('folds the soft mutation, word by word', () => {
    expect(isSoftMutationVariant(C, 'Cymraeg', 'Gymraeg')).toBe(true);
    expect(isSoftMutationVariant(C, 'medra i', 'fedra i')).toBe(true);
    expect(isSoftMutationVariant(C, 'dysgu', 'ddysgu')).toBe(true);
    expect(isSoftMutationVariant(C, 'gorffen', 'orffen')).toBe(true);
    expect(isSoftMutationVariant(C, 'llyfr', 'lyfr')).toBe(true);
    expect(isSoftMutationVariant(C, 'trio', 'drio')).toBe(true);
    expect(isSoftMutationVariant(C, 'mi fedra i', 'medra i')).toBe(true);   // Aran's medra/fedra
    expect(isSoftMutationVariant(C, 'medra i', 'mi fedra i')).toBe(true);
  });
  it('does not fold nasal or aspirate mutation, different words, or non-Welsh courses', () => {
    expect(isSoftMutationVariant(C, 'Cymraeg', 'Nghymraeg')).toBe(false);
    expect(isSoftMutationVariant(C, 'cath', 'chath')).toBe(false);
    expect(isSoftMutationVariant(C, 'siop', 'siopa')).toBe(false);
    expect(isSoftMutationVariant(C, 'Cymraeg', 'Cymraeg')).toBe(false);
    expect(isSoftMutationVariant(C, 'i mi', 'i')).toBe(false);
    expect(isSoftMutationVariant('fra_for_eng', 'Cymraeg', 'Gymraeg')).toBe(false);
  });
});
