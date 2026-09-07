// The join test for the editor-identity ruling (Tom, 2026-09-01).
//
// content-write-surfaces.test.cjs proves a route is LISTED. Listing is not
// attribution: the v2 finalize and phrases handlers were listed from day one and
// still wrote 1,990 course_legos and 16,041 course_practice_phrases rows with
// last_edit_event_id NULL, because neither ever called req.contentEdit.record().
// The gate's res.on('finish') fallback filed an event row after the response —
// an event nothing pointed at.
//
// So this test checks the JOIN instead: drive the two handlers with a stub
// supabase, and assert every content row they write carries the exact id that
// .record() returned, and that .record() ran BEFORE the first write (an event
// recorded afterwards cannot be stamped on anything).
//
// Run: npx vitest run services/course-builder/routes/v2-content-edit-attribution

import { describe, it, expect } from 'vitest'

const EVENT_ID = '11111111-2222-3333-4444-555555555555';
const CONTENT_TABLES = ['course_seeds', 'course_legos', 'course_practice_phrases'];

// ── stub supabase ───────────────────────────────────────────────────────────
// Every filter/order method chains; the builder is thenable so `await` on any
// prefix of the chain resolves. Reads come from `rows[table]`; writes are logged
// in call order alongside the .record() call, which is what lets us assert the
// ordering the bug was about.
function makeSupabase(rows = {}) {
  const writes = [];
  const order = [];
  let tick = 0;

  function builder(table) {
    const b = {
      _single: false,
      then(resolve, reject) {
        const data = rows[table] || [];
        return Promise.resolve({ data: b._single ? (data[0] || null) : data, error: null })
          .then(resolve, reject);
      },
    };
    for (const m of ['select', 'eq', 'neq', 'in', 'lt', 'lte', 'gt', 'gte', 'not', 'is',
                     'order', 'limit', 'range', 'filter', 'match', 'or', 'delete']) {
      b[m] = () => b;
    }
    b.single = b.maybeSingle = () => { b._single = true; return b; };
    for (const m of ['insert', 'upsert', 'update']) {
      b[m] = (payload) => {
        writes.push({ table, op: m, rows: Array.isArray(payload) ? payload : [payload], at: ++tick });
        order.push({ kind: 'write', table, op: m, at: tick });
        return b;
      };
    }
    return b;
  }

  return { from: builder, _writes: writes, _order: order, _tick: () => ++tick };
}

function makeCtx(rows) {
  const supabase = makeSupabase(rows);
  return {
    supabase,
    courseVocabCache: new Map(),
    config: {},
  };
}

// req.contentEdit as the gate builds it: .record() is idempotent and returns the
// event id the handler must stamp onto its rows.
function makeContentEdit(supabase) {
  let calls = 0;
  let at = null;
  return {
    surface: 'course-builder:POST /api/v2/test',
    operation: 'test',
    courseCode: 'tst_for_eng',
    identity: { kind: 'agent', id: 'test-agent' },
    async record() {
      calls++;
      if (at === null) {
        at = supabase._tick();
        supabase._order.push({ kind: 'record', at });
      }
      return EVENT_ID;
    },
    get eventId() { return EVENT_ID; },
    get _calls() { return calls; },
    get _at() { return at; },
  };
}

function makeRes() {
  const res = { statusCode: 200, body: null };
  res.status = (c) => { res.statusCode = c; return res; };
  res.json = (b) => { res.body = b; return res; };
  return res;
}

function handlerFor(router, method, path) {
  for (const layer of router.stack) {
    const route = layer.route;
    if (!route || route.path !== path) continue;
    if (!route.methods[method.toLowerCase()]) continue;
    const stack = route.stack;
    return stack[stack.length - 1].handle;
  }
  throw new Error(`no handler for ${method} ${path}`);
}

// The rows this request CREATES. Derived-field updates written afterwards by
// the phrase-decomposition writer are part of the same event and carry no stamp
// of their own, so they are not what this test is about.
function contentWrites(supabase) {
  return supabase._writes.filter(w => CONTENT_TABLES.includes(w.table)
    && (w.op === 'insert' || w.op === 'upsert'));
}

describe('POST /v2/decompose/finalize/:courseCode stamps its rows', () => {
  async function run() {
    const drafts = [{
      course_code: 'tst_for_eng',
      seed_number: 1,
      known_text: 'i want to speak',
      target_text: 'quiero hablar',
      validation_status: 'valid',
      submission_data: {
        legos: [
          { idx: 1, type: 'A', known: 'i want', target: 'quiero' },
          { idx: 2, type: 'A', known: 'to speak', target: 'hablar' },
        ],
      },
    }];
    const ctx = makeCtx({
      course_seed_drafts: drafts,
      course_legos: [],
      course_gender_expansions: [],
      course_seeds: [],
      course_practice_phrases: [],
    });
    const router = require('./v2.cjs')(ctx);
    const handler = handlerFor(router, 'POST', '/v2/decompose/finalize/:courseCode');

    const contentEdit = makeContentEdit(ctx.supabase);
    const req = { params: { courseCode: 'tst_for_eng' }, body: {}, headers: {}, contentEdit };
    const res = makeRes();
    await handler(req, res);
    return { ctx, res, contentEdit };
  }

  it('writes seeds and legos, and every row carries the recorded event id', async () => {
    const { ctx, res } = await run();
    expect(res.statusCode).toBe(200);

    const written = contentWrites(ctx.supabase);
    expect(written.length).toBeGreaterThan(0);
    expect(written.map(w => w.table)).toContain('course_seeds');
    expect(written.map(w => w.table)).toContain('course_legos');

    for (const w of written) {
      for (const row of w.rows) {
        expect(row.last_edit_event_id, `${w.table}.${w.op} row missing attribution`).toBe(EVENT_ID);
      }
    }
  });

  it('records the event BEFORE the first content write', async () => {
    const { ctx, contentEdit } = await run();
    expect(contentEdit._calls).toBeGreaterThan(0);
    const firstWrite = contentWrites(ctx.supabase)[0];
    expect(contentEdit._at).toBeLessThan(firstWrite.at);
  });

  it('records exactly one event for the whole finalize', async () => {
    const { ctx, contentEdit } = await run();
    expect(ctx.supabase._order.filter(o => o.kind === 'record').length).toBe(1);
    // .record() is idempotent in the gate, so calling it repeatedly is safe —
    // what matters is that one event covers the batch.
    expect(contentEdit._calls).toBeGreaterThanOrEqual(1);
  });
});

describe('POST /v2/phrases/:courseCode stamps its rows', () => {
  async function run() {
    const ctx = makeCtx({
      // The first row is the LEGO the handler looks up; the rest are the
      // already-introduced vocabulary the phrases are allowed to draw on.
      course_legos: [
        { known_text: 'i want', target_text: 'quiero', type: 'A', components: null, is_new: true,
          seed_number: 1, lego_index: 1 },
        { known_text: 'to speak', target_text: 'hablar', type: 'A', components: null, is_new: true,
          seed_number: 1, lego_index: 2 },
        { known_text: 'spanish', target_text: 'espanol', type: 'A', components: null, is_new: true,
          seed_number: 1, lego_index: 3 },
      ],
      course_seeds: [],
      course_practice_phrases: [],
    });
    const router = require('./v2.cjs')(ctx);
    const handler = handlerFor(router, 'POST', '/v2/phrases/:courseCode');

    const contentEdit = makeContentEdit(ctx.supabase);
    const req = {
      params: { courseCode: 'tst_for_eng' },
      headers: {},
      contentEdit,
      body: {
        phrases: [{
          seed_number: 1,
          lego_index: 1,
          build: [{ known: 'i want to speak', target: 'quiero hablar' }],
          use: [{ known: 'i want to speak spanish', target: 'quiero hablar espanol' }],
        }],
      },
    };
    const res = makeRes();
    await handler(req, res);
    return { ctx, res, contentEdit };
  }

  it('every phrase row carries the recorded event id', async () => {
    const { ctx, res } = await run();
    expect(res.statusCode).toBe(200);
    expect(res.body.errors, JSON.stringify(res.body.errors)).toBeUndefined();

    const written = contentWrites(ctx.supabase).filter(w => w.table === 'course_practice_phrases');
    expect(written.length).toBeGreaterThan(0);
    for (const w of written) {
      for (const row of w.rows) {
        expect(row.last_edit_event_id, 'phrase row missing attribution').toBe(EVENT_ID);
      }
    }
  });

  it('records the event BEFORE the first phrase write', async () => {
    const { ctx, contentEdit } = await run();
    expect(contentEdit._calls).toBeGreaterThan(0);
    const firstWrite = contentWrites(ctx.supabase)[0];
    expect(contentEdit._at).toBeLessThan(firstWrite.at);
  });
});

// A handler with no gate mounted (a unit test, a script calling the router
// directly) must still work — the stamp is simply NULL, which honestly says "no
// attribution was captured" rather than inventing one (Tom, 2026-09-01).
describe('no gate mounted', () => {
  it('finalize still writes, with a null stamp', async () => {
    const ctx = makeCtx({
      course_seed_drafts: [{
        course_code: 'tst_for_eng', seed_number: 1,
        known_text: 'i want', target_text: 'quiero', validation_status: 'valid',
        submission_data: { legos: [{ idx: 1, type: 'A', known: 'i want', target: 'quiero' }] },
      }],
      course_legos: [], course_gender_expansions: [], course_seeds: [], course_practice_phrases: [],
    });
    const router = require('./v2.cjs')(ctx);
    const handler = handlerFor(router, 'POST', '/v2/decompose/finalize/:courseCode');
    const res = makeRes();
    await handler({ params: { courseCode: 'tst_for_eng' }, body: {}, headers: {} }, res);
    expect(res.statusCode).toBe(200);
    for (const w of contentWrites(ctx.supabase)) {
      for (const row of w.rows) expect(row.last_edit_event_id).toBeNull();
    }
  });
});
