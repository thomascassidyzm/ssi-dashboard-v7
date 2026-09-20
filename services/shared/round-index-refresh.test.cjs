/*
 * The bug this proves gone: a write path adds legos and NOBODY refreshes
 * course_round_index, so the learner walks to the end of the old map and the
 * course silently ends. afr_for_eng sat nine rounds short of its own content
 * for weeks that way. Tom's ruling, 2026-09-20: the step that writes legos
 * refreshes the view as its last act, so a course cannot ship stale BY
 * CONSTRUCTION — the nightly is the backstop, not the fix.
 *
 * So the case that gets a test is the seam itself: a successful write to a
 * lego-writing surface must produce exactly one refresh, a phrase-only surface
 * must produce none, a failed write must produce none, and a burst must
 * COALESCE — because a refresh per seed on a 90-seed build is the failure shape
 * that would get this reverted.
 *
 * No database: the refresh statement is swapped for a counter.
 *
 * Run: npx vitest run services/shared/round-index-refresh.test.cjs
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
const { EventEmitter } = require('events');

const refresh = require('./round-index-refresh.cjs');
const { contentEditGate } = require('./content-edit-gate.cjs');
const { SURFACES, LEGO_WRITING_SURFACES } = require('./content-write-surfaces.cjs');

const quiet = { log() {}, warn() {}, error() {} };

/** Count refreshes instead of running one, and make the debounce instant. */
let ran;
beforeEach(() => {
  ran = [];
  process.env.ROUND_INDEX_DEBOUNCE_MS = '1';
  refresh.__setRefreshImpl(async () => { ran.push(Date.now()); }, quiet);
});
afterEach(() => { refresh.__setRefreshImpl(null); });

// The helper reads DEBOUNCE_MS at module load, so drive the timing explicitly
// with { immediate: true } where a test is about one request, and with
// flushRoundIndexRefresh() where it is about a burst.

describe('requestRoundIndexRefresh', () => {
  it('refreshes once for one request', async () => {
    const r = await refresh.requestRoundIndexRefresh('fra_for_eng', { immediate: true });
    expect(r.ok).toBe(true);
    expect(ran.length).toBe(1);
  });

  it('coalesces a burst — 90 seed submissions do NOT cost 90 refreshes', async () => {
    for (let i = 1; i <= 90; i++) refresh.requestRoundIndexRefresh('fra_for_eng', { reason: `seed ${i}` });
    await refresh.flushRoundIndexRefresh();
    expect(ran.length).toBe(1);
  });

  it('still refreshes AFTER a write that lands while a refresh is running', async () => {
    // The view must be refreshed after the LAST write, not after whichever one
    // happened to start the refresh — otherwise the final seed of a build is
    // the one that goes missing.
    let release;
    refresh.__setRefreshImpl(() => {
      ran.push(Date.now());
      if (ran.length > 1) return Promise.resolve();
      return new Promise(r => { release = r; });
    }, quiet);
    const first = refresh.requestRoundIndexRefresh('fra_for_eng', { immediate: true });
    await new Promise(r => setTimeout(r, 5));
    refresh.requestRoundIndexRefresh('fra_for_eng');       // arrives mid-flight
    release();
    await first;
    await refresh.flushRoundIndexRefresh();
    expect(ran.length).toBe(2);
  });

  it('never rejects into the caller when the refresh fails, and says so', async () => {
    refresh.__setRefreshImpl(async () => { throw new Error('no such view'); }, quiet);
    const r = await refresh.requestRoundIndexRefresh('fra_for_eng', { immediate: true });
    expect(r.ok).toBe(false);
    expect(r.error).toMatch(/no such view/);
  });
});

// ─── the seam: the gate asks for the refresh, so no handler has to remember ──

function drive(method, path, { status = 200, body = {} } = {}) {
  // A same-host declared agent, which is what a build submission actually is —
  // the gate must resolve an identity or it answers 401 and the handler (and so
  // the refresh) never happens.
  const gate = contentEditGate({ supabase: { from: () => { throw new Error('no db in this test'); } },
                                 service: 'course-builder', logger: quiet });
  const req = {
    method, path, url: path, body,
    socket: { remoteAddress: '127.0.0.1' },
    headers: { 'x-agent-id': 'round-index-test', 'x-agent-role': 'checker' },
  };
  const res = new EventEmitter();
  res.statusCode = status;
  res.status = (code) => { res.statusCode = code; return { json: () => { res.emit('finish'); } }; };
  return new Promise((resolve, reject) => {
    res.on('finish', resolve);
    gate(req, res, () => { res.emit('finish'); }).catch(reject);
  });
}

describe('content-edit-gate refreshes the round map by construction', () => {
  it('asks for a refresh after a successful lego write', async () => {
    await drive('POST', '/api/seed/complete', { body: { course_code: 'fra_for_eng' } });
    await refresh.flushRoundIndexRefresh();
    expect(ran.length).toBe(1);
  });

  it('asks for nothing after a phrase-only write — a phrase moves no round', async () => {
    await drive('POST', '/api/qa/mark-checked', { body: { course_code: 'fra_for_eng' } });
    await refresh.flushRoundIndexRefresh();
    expect(ran.length).toBe(0);
  });

  it('asks for nothing when the write failed', async () => {
    await drive('POST', '/api/seed/complete', { status: 400, body: { course_code: 'fra_for_eng' } });
    await refresh.flushRoundIndexRefresh();
    expect(ran.length).toBe(0);
  });

  it('covers every lego-writing surface in the manifest, not just the one above', async () => {
    expect(LEGO_WRITING_SURFACES.length).toBeGreaterThan(5);
    for (const s of LEGO_WRITING_SURFACES) {
      ran = [];
      const path = s.path.replace(/:courseCode|:code/g, 'fra_for_eng');
      await drive(s.method, path);
      await refresh.flushRoundIndexRefresh();
      expect(ran.length, `${s.method} ${s.path} did not ask for a round-index refresh`).toBe(1);
    }
  });

  it('leaves the surfaces that write no legos alone', async () => {
    const legoPaths = new Set(LEGO_WRITING_SURFACES.map(s => `${s.method} ${s.path}`));
    for (const s of SURFACES) {
      if (legoPaths.has(`${s.method} ${s.path}`)) continue;
      ran = [];
      const path = s.path.replace(/:courseCode|:code/g, 'fra_for_eng');
      await drive(s.method, path);
      await refresh.flushRoundIndexRefresh();
      expect(ran.length, `${s.method} ${s.path} refreshed the round map but writes no legos`).toBe(0);
    }
  });
});
