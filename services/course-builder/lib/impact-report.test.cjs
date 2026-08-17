/**
 * Tests for the impact-report adapter — PART B of edit-impact-check.
 *
 * These pin the three things Kai's ruling of 2026-08-17 turns into invariants,
 * because every one of them is a silent failure if it regresses:
 *
 *   1. the verdict APPEARS in the submit response, alongside everything the
 *      response already returned (nothing existing changed or removed);
 *   2. a reporter throw / hang does NOT fail the submit — the write still happens
 *      and the response still 200s;
 *   3. a `reconsider` verdict does NOT block the write. Proposal C (a blocking
 *      gate) was REJECTED; the verdict is returned, never enforced.
 *
 * The route-level tests mount the real course-data router on a real express app,
 * over a fake supabase, and assert on what the HTTP caller actually receives —
 * a unit test of the adapter alone could not prove "the write still happened".
 *
 * No real course data is touched: the supabase client is an in-memory fake and
 * checkEdits is injected, so nothing here opens a DB connection.
 *
 * Run: npx vitest run services/course-builder/lib/impact-report
 */

import { describe, it, expect } from 'vitest'

const express = require('express')
const { impactFor, impactRequested } = require('./impact-report.cjs')

// ─────────────────────────────────────────────────────────────────────────────
// The adapter itself
// ─────────────────────────────────────────────────────────────────────────────

const envelope = (verdict, over = {}) => ({
  decision: {
    verdict,
    headline: `headline for ${verdict}`,
    required_actions: ['DO THE THING'],
    reconsider_edits: verdict === 'reconsider' ? [{ key: 'seed 5', reasons: ['course-wide-breakage'] }] : [],
  },
  summary: { danger: 1, warn: 0, clips_needing_render: 3, phrases_broken_course_wide: 2 },
  reports: [],
  ...over,
})

describe('impactFor', () => {
  it('passes the verdict and the required actions straight through', async () => {
    const r = await impactFor('tst_for_eng', [{ seed: 5, known: 'x' }], {
      checkEdits: async () => envelope('proceed-with-repairs'),
    })
    expect(r.checked).toBe(true)
    expect(r.status).toBe('ok')
    expect(r.verdict).toBe('proceed-with-repairs')
    expect(r.required_actions).toEqual(['DO THE THING'])
    expect(r.enforced).toBe(false)
    expect(typeof r.duration_ms).toBe('number')
  })

  it('records that the check ran against the PRE-edit state', async () => {
    const r = await impactFor('tst_for_eng', [{ seed: 5 }], { checkEdits: async () => envelope('proceed') })
    expect(r.state).toBe('pre-edit')
  })

  it('a reporter THROW resolves to an unavailable block — it never rejects', async () => {
    const r = await impactFor('tst_for_eng', [{ seed: 5 }], {
      checkEdits: async () => { throw new Error('.env.psql not found') },
    })
    expect(r.checked).toBe(false)
    expect(r.status).toBe('unavailable')
    expect(r.reason).toMatch(/env\.psql/)
    // Crucially: NOT a verdict. A failed check must never read as a clean pass.
    expect(r.verdict).toBeUndefined()
  })

  it('a reporter that throws SYNCHRONOUSLY is caught too', async () => {
    const r = await impactFor('tst_for_eng', [{ seed: 5 }], {
      checkEdits: () => { throw new Error('boom on call') },
    })
    expect(r.checked).toBe(false)
    expect(r.status).toBe('unavailable')
  })

  it('a hanging / slow reporter times out and the block says timeout, not proceed', async () => {
    const r = await impactFor('tst_for_eng', [{ seed: 5 }], {
      timeoutMs: 30,
      checkEdits: () => new Promise(() => { /* never settles: the "DB is slow" case */ }),
    })
    expect(r.checked).toBe(false)
    expect(r.status).toBe('timeout')
    expect(r.verdict).toBeUndefined()
  })

  it('a missing tool module degrades instead of taking the route down', async () => {
    // No injection and no .env.psql-backed DB in a test runner: whatever goes
    // wrong, it comes back as a resolved block.
    const r = await impactFor('tst_for_eng', [{ seed: 5 }], { timeoutMs: 200 })
    expect(r.checked).toBe(false)
    expect(['unavailable', 'timeout']).toContain(r.status)
  })

  it('runs nothing when not requested', async () => {
    let called = false
    const r = await impactFor('tst_for_eng', [{ seed: 5 }], {
      requested: false,
      checkEdits: async () => { called = true; return envelope('proceed') },
    })
    expect(called).toBe(false)
    expect(r.status).toBe('skipped')
  })

  it('an empty edit list is skipped, not reported as a pass', async () => {
    const r = await impactFor('tst_for_eng', [], { checkEdits: async () => envelope('proceed') })
    expect(r.checked).toBe(false)
    expect(r.status).toBe('skipped')
  })

  it('caps a big batch but SAYS what it did not check — no silent truncation', async () => {
    const edits = Array.from({ length: 25 }, (_, i) => ({ seed: i + 1, target: 't' }))
    let seen = 0
    const r = await impactFor('tst_for_eng', edits, {
      maxEdits: 10,
      checkEdits: async (_c, list) => { seen = list.length; return envelope('proceed') },
    })
    expect(seen).toBe(10)
    expect(r.edits_checked).toBe(10)
    expect(r.edits_not_checked).toBe(15)
    expect(r.edits_not_checked_note).toMatch(/APPLIED but NOT checked/)
  })
})

describe('impactRequested', () => {
  const req = (query = {}, body = {}) => ({ query, body })

  it('honours the endpoint default when the caller says nothing', () => {
    expect(impactRequested(req(), true)).toBe(true)
    expect(impactRequested(req(), false)).toBe(false)
  })

  it('?impact=0 opts out of the latency, ?impact=1 opts in', () => {
    expect(impactRequested(req({ impact: '0' }), true)).toBe(false)
    expect(impactRequested(req({ impact: 'false' }), true)).toBe(false)
    expect(impactRequested(req({ impact: '1' }), false)).toBe(true)
    expect(impactRequested(req({ impact: 'true' }), false)).toBe(true)
  })

  it('reads the body too, for callers that cannot add a query param', () => {
    expect(impactRequested(req({}, { impact: true }), false)).toBe(true)
    expect(impactRequested(req({}, { impact: false }), true)).toBe(false)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// The wired endpoint: PATCH /api/seed/:courseCode/:seedNumber
//
// Proves the invariants end-to-end — the write happens, the response keeps every
// field it had, and the verdict rides along.
// ─────────────────────────────────────────────────────────────────────────────

// Minimal supabase fake: records the update it was asked to perform.
function fakeSupabase(writes) {
  const chain = (table) => {
    const state = { table, filters: {} }
    const self = {
      update(fields) { state.fields = fields; return self },
      eq(col, val) { state.filters[col] = val; return self },
      then(resolve) { writes.push({ ...state }); return Promise.resolve({ error: null }).then(resolve) },
    }
    return self
  }
  return { from: (table) => chain(table) }
}

function mountSeedPatch(checkEdits) {
  const writes = []
  // Injection seam: the route reads its default checkEdits lazily from the tool,
  // so for the test we stub the tool module in require.cache before mounting.
  const toolPath = require.resolve('../../../tools/edit-impact-check.cjs')
  require.cache[toolPath] = { id: toolPath, filename: toolPath, loaded: true, exports: { checkEdits } }

  delete require.cache[require.resolve('./impact-report.cjs')]
  delete require.cache[require.resolve('../routes/course-data.cjs')]
  const makeRouter = require('../routes/course-data.cjs')

  const app = express()
  app.use(express.json())
  app.use('/api', makeRouter({
    supabase: fakeSupabase(writes),
    config: {},
    courseActivity: new Map(),
    agentHeartbeats: new Map(),
    activeBuilds: new Map(),
    courseVocabCache: new Map(),
    balanceViolations: {},
  }))
  return { app, writes }
}

async function patchSeed(app, path, body) {
  const server = app.listen(0)
  try {
    const { port } = server.address()
    const resp = await fetch(`http://127.0.0.1:${port}${path}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    return { status: resp.status, json: await resp.json() }
  } finally {
    server.close()
  }
}

describe('PATCH /api/seed/:courseCode/:seedNumber', () => {
  it('returns the verdict under `impact` WITHOUT disturbing the existing fields', async () => {
    const { app, writes } = mountSeedPatch(async () => envelope('proceed-with-repairs'))
    const { status, json } = await patchSeed(app, '/api/seed/tst_for_eng/5', { target_text: 'newtext' })

    expect(status).toBe(200)
    // Everything the response returned before Part B, unchanged:
    expect(json.ok).toBe(true)
    expect(json.seed).toBe(5)
    expect(json.target_text).toBe('newtext')
    // …plus the new key.
    expect(json.impact.verdict).toBe('proceed-with-repairs')
    expect(json.impact.enforced).toBe(false)
    // And the write actually happened.
    expect(writes.some(w => w.table === 'course_seeds' && w.fields?.target_text === 'newtext')).toBe(true)
  })

  it('a RECONSIDER verdict does not block the write — the ruling, in a test', async () => {
    const { app, writes } = mountSeedPatch(async () => envelope('reconsider'))
    const { status, json } = await patchSeed(app, '/api/seed/tst_for_eng/5', { target_text: 'breaks 40 phrases' })

    expect(status).toBe(200)
    expect(json.ok).toBe(true)
    expect(json.impact.verdict).toBe('reconsider')
    expect(json.impact.reconsider_edits.length).toBe(1)
    // The edit is applied exactly as it would have been before this wiring existed.
    expect(writes.some(w => w.table === 'course_seeds' && w.fields?.target_text === 'breaks 40 phrases')).toBe(true)
  })

  it('a reporter THROW does not fail the submit', async () => {
    const { app, writes } = mountSeedPatch(async () => { throw new Error('DB unreachable') })
    const { status, json } = await patchSeed(app, '/api/seed/tst_for_eng/7', { known_text: 'kk' })

    expect(status).toBe(200)
    expect(json.ok).toBe(true)
    expect(json.impact.checked).toBe(false)
    expect(json.impact.status).toBe('unavailable')
    expect(writes.some(w => w.table === 'course_seeds' && w.fields?.known_text === 'kk')).toBe(true)
  })

  it('?impact=0 skips the check entirely and the submit is untouched', async () => {
    let called = false
    const { app, writes } = mountSeedPatch(async () => { called = true; return envelope('proceed') })
    const { status, json } = await patchSeed(app, '/api/seed/tst_for_eng/9?impact=0', { target_text: 'quiet' })

    expect(status).toBe(200)
    expect(called).toBe(false)
    expect(json.impact.status).toBe('skipped')
    expect(writes.some(w => w.fields?.target_text === 'quiet')).toBe(true)
  })

  it('still rejects a body with no text at all — the existing 400 is unchanged', async () => {
    const { app } = mountSeedPatch(async () => envelope('proceed'))
    const { status, json } = await patchSeed(app, '/api/seed/tst_for_eng/5', {})
    expect(status).toBe(400)
    expect(json.error).toMatch(/required/)
  })
})
