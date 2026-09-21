/**
 * THE TWO PROMISES OF THE HQ PAGE, ASSERTED.
 *
 *  1. Company numbers are ADMIN ONLY. An editor, a recorder, an anonymous
 *     caller: refused at the endpoint, with no body of numbers behind the refusal.
 *  2. A BLANK IS NOT A ZERO. A number with no readable source must come back as
 *     value null with the honest blank and a reason — never 0, which is a claim
 *     the record cannot support.
 *
 * The supabase client is a stub: what is under test is the gate and the shape,
 * not PostgREST.
 */
import { describe, it, expect } from 'vitest'
import express from 'express'
import hq from './hq-routes.cjs'

const { mount, buildHq, direction, HONEST_BLANK, NO_OWNER_RECORDED, NO_TRACE_SOURCE } = hq

/** Exactly what public.hq_facts() returns, trimmed to what the builder reads. */
const FACTS = {
  generated_at: '2026-09-21T15:00:00Z',
  last_content_edit_at: '2026-09-21T14:59:00Z',
  last_content_edit_actor: 'shuchita',
  last_content_edit_kind: 'human',
  content_edits_7d: 1814,
  content_edits_prior_7d: 1377,
  legos_7d: 1788,
  legos_prior_7d: 256,
  seeds_30d: 668,
  seeds_prior_30d: 2672,
  courses_live: 20,
  courses_beta: 59,
  last_audio_written_at: '2026-09-21T14:11:56Z',
  active_voices: 430,
  last_session_at: '2026-09-21T14:46:00Z',
  active_learners_7d: 194,
  active_learners_prior_7d: 459,
  real_learners: 657,
  new_learners_7d: 95,
  new_learners_prior_7d: 79,
  real_schools: 24,
  schools_last_touch_at: '2026-09-18T10:28:45Z',
  org_enrolments: 8,
  active_subscriptions: 7,
  cancelled_subscriptions: 12,
  subs_new_30d: 3,
  subs_new_prior_30d: 0,
  active_entitlements: 115,
  last_billing_webhook_at: '2026-09-21T14:25:58Z',
  try_links: 3,
  last_try_link_visit_at: '2026-07-18T03:03:08Z',
  board_snapshots: 0,
  last_board_snapshot_at: null,
}

/** The real gate's behaviour, narrowed: admin passes, everyone else is refused. */
function gateFor (role) {
  return async (req, res) => {
    if (role === 'admin') return { email: 'tom@example.com', role }
    if (!role) { res.status(401).json({ error: 'Authentication required' }); return null }
    res.status(403).json({ error: 'Admin access required' })
    return null
  }
}

function appFor (role) {
  const app = express()
  const calls = { rpc: 0 }
  mount(app, {
    requireAdmin: gateFor(role),
    supabase: { rpc: async () => { calls.rpc += 1; return { data: FACTS, error: null } } },
    logger: { log () {}, error () {} },
  })
  return { app, calls }
}

async function get (app, path) {
  const server = app.listen(0)
  try {
    const { port } = server.address()
    const r = await fetch(`http://127.0.0.1:${port}${path}`)
    return { status: r.status, body: await r.json() }
  } finally {
    server.close()
  }
}

describe('GET /api/hq — admin only', () => {
  it('refuses an editor identity with 403, and never reads the numbers behind the refusal', async () => {
    const { app, calls } = appFor('editor')
    const { status, body } = await get(app, '/api/hq')
    expect(status).toBe(403)
    expect(body.numbers).toBeUndefined()
    expect(body.functions).toBeUndefined()
    // The refusal must SHORT-CIRCUIT: a gate that responds but does not stop the
    // handler still hits the database with company numbers on a refused request.
    expect(calls.rpc).toBe(0)
  })

  it('refuses an anonymous caller with 401, and reads nothing', async () => {
    const { app, calls } = appFor(null)
    const { status, body } = await get(app, '/api/hq')
    expect(status).toBe(401)
    expect(body.numbers).toBeUndefined()
    expect(calls.rpc).toBe(0)
  })

  it('serves the overview to an admin', async () => {
    const { app } = appFor('admin')
    const { status, body } = await get(app, '/api/hq')
    expect(status).toBe(200)
    expect(body.functions.length).toBeGreaterThan(0)
    expect(body.numbers.length).toBeGreaterThan(0)
  })
})

describe('a blank is not a zero', () => {
  const page = buildHq(FACTS)
  const byKey = (k) => page.numbers.find((n) => n.key === k)

  it('renders every unreadable number as the honest blank, never as 0', () => {
    for (const key of ['subscribers', 'government_contract', 'marketing_spend', 'cash_actuals', 'costs_by_line', 'store_conversions']) {
      const n = byKey(key)
      expect(n, key).toBeTruthy()
      expect(n.readable).toBe(false)
      expect(n.value).toBeNull()
      expect(n.value).not.toBe(0)
      expect(n.display).toBe(HONEST_BLANK)
      expect(n.blank_reason.length).toBeGreaterThan(10)
      expect(n.unlock.length).toBeGreaterThan(10)
    }
  })

  it('a readable zero stays a zero — board snapshots really are none', () => {
    const board = page.functions.find((f) => f.key === 'board')
    expect(board.last_seen).toBeNull()
    expect(board.gap).toMatch(/0 rows/)
    // …and it is a DIFFERENT gap from a function with no trace source at all.
    expect(board.trace_source).not.toBe(NO_TRACE_SOURCE)
    expect(page.functions.find((f) => f.key === 'partnerships').trace_source).toBe(NO_TRACE_SOURCE)
  })

  it('gives no direction where the prior period cannot be read', () => {
    expect(direction(5, null)).toBeNull()
    expect(direction(null, 5)).toBeNull()
    expect(direction(5, 2)).toBe('up')
    expect(direction(2, 5)).toBe('down')
    expect(direction(5, 5)).toBe('flat')
    expect(byKey('app_subscriptions').direction).toBeNull()
    expect(byKey('active_learners').direction).toBe('down')
  })
})

describe('owners', () => {
  it('records no owner for any function, because nothing in the estate records one', () => {
    for (const f of buildHq(FACTS).functions) {
      expect(f.owner).toBeNull()
      expect(f.owner_display).toBe(NO_OWNER_RECORDED)
    }
  })
})
