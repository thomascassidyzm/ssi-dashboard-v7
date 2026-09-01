/**
 * The proof for Tom's 2026-09-01 ruling: an edit to course content cannot be
 * written without an editor identity attached.
 *
 * These tests drive a REAL express app over a REAL loopback socket, because the
 * distinction the gate turns on — is this caller same-host, or did it come in
 * through the proxy from a browser? — lives in the socket and the headers, and a
 * mocked req object would let us assert a fiction. The Supabase client is a fake
 * (no live DB): what we are pinning is the gate's decisions and the shape of the
 * row it writes, not Postgres.
 *
 * What each case is defending:
 *   - the community-editor case: an unauthenticated browser write is refused,
 *     and the handler never runs, so nothing reaches the database;
 *   - the colleague case: a verified Supabase session produces a human actor
 *     with actor_verified = true;
 *   - the honesty case: a same-host agent's self-declaration is recorded as
 *     actor_verified = FALSE, never dressed up as verified identity;
 *   - the no-loophole case: no combination of headers produces a blank actor.
 *
 * Run: npx vitest run services/shared/content-edit-gate
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'

const express = require('express')
const http = require('http')
const { contentEditGate } = require('./content-edit-gate.cjs')
const { recordContentEdit } = require('./content-edit-log.cjs')
const { EditorIdentityRequired, serviceIdentity, _clearCache } = require('./editor-identity.cjs')

// ── Fake Supabase: auth.getUser + the three tables the resolver reads ───────
function makeSupabase({ users = {}, dashboardUsers = [], learners = [] } = {}) {
  const inserted = []
  return {
    inserted,
    auth: {
      async getUser(token) {
        const user = users[token]
        return user ? { data: { user }, error: null } : { data: { user: null }, error: { message: 'bad token' } }
      },
    },
    from(table) {
      const rows = table === 'dashboard_users' ? dashboardUsers
        : table === 'learners' ? learners : []
      const q = {
        _filters: [],
        select() { return q },
        eq(col, val) { q._filters.push([col, val]); return q },
        maybeSingle() {
          const hit = rows.find(r => q._filters.every(([c, v]) => r[c] === v))
          return Promise.resolve({ data: hit || null, error: null })
        },
        single() {
          if (table !== 'content_edit_events') return Promise.resolve({ data: null, error: null })
          return Promise.resolve({ data: { id: `evt-${inserted.length}` }, error: null })
        },
        insert(row) { inserted.push({ table, row }); return q },
      }
      return q
    },
  }
}

const TOKEN = 'good-token'
function supabaseWithHuman() {
  return makeSupabase({
    users: { [TOKEN]: { id: 'user-uuid-1', email: 'shuchita@example.com' } },
    dashboardUsers: [{ email: 'shuchita@example.com', name: 'Shuchita', role: 'editor', courses: '*', voice_id: null }],
  })
}

// A content-writing surface from the manifest, plus a control route that is not.
function makeApp(supabase, { onWrite } = {}) {
  const app = express()
  app.use(express.json())
  app.use(contentEditGate({ supabase, service: 'course-builder', logger: { warn() {}, error() {} } }))
  app.patch('/api/seed/:courseCode/:seedNumber', async (req, res) => {
    onWrite?.(req)
    const eventId = req.contentEdit ? await req.contentEdit.record({ scope: { seed_numbers: [42] } }) : null
    res.json({ ok: true, eventId, identity: req.editorIdentity })
  })
  app.get('/api/course/:courseCode/health-check', (req, res) => {
    res.json({ ok: true, gated: !!req.contentEdit })
  })
  // A record-only surface: writes content as a side effect of a read.
  app.get('/api/course/:courseCode/seed-editor', async (req, res) => {
    const eventId = req.contentEdit && req.query.initialise
      ? await req.contentEdit.record({ scope: { course_code: req.params.courseCode, rows: 668 } })
      : null
    res.json({ ok: true, gated: !!req.contentEdit, eventId })
  })
  return app
}

let server, base
async function listen(app) {
  server = http.createServer(app)
  await new Promise(r => server.listen(0, '127.0.0.1', r))
  base = `http://127.0.0.1:${server.address().port}`
}

beforeEach(() => { _clearCache(); delete process.env.CONTENT_EDIT_IDENTITY_MODE })
afterEach(async () => { if (server) await new Promise(r => server.close(r)); server = null })

// A browser request always arrives with a forwarding header — that is what the
// production-api proxy now guarantees for anything that came from outside.
const BROWSER = { 'x-forwarded-for': '203.0.113.9', 'content-type': 'application/json' }

describe('the gate refuses a content write with no identity', () => {
  it('401s an unauthenticated browser edit and never runs the handler', async () => {
    let handlerRan = false
    await listen(makeApp(supabaseWithHuman(), { onWrite: () => { handlerRan = true } }))

    const res = await fetch(`${base}/api/seed/eng_for_hin/42`, {
      method: 'PATCH', headers: BROWSER, body: JSON.stringify({ target_text: 'x' }),
    })

    expect(res.status).toBe(401)
    expect((await res.json()).code).toBe('EDITOR_IDENTITY_REQUIRED')
    expect(handlerRan, 'the handler must not run — nothing may reach the database').toBe(false)
  })

  it('401s an invalid or expired session token', async () => {
    await listen(makeApp(supabaseWithHuman()))
    const res = await fetch(`${base}/api/seed/eng_for_hin/42`, {
      method: 'PATCH',
      headers: { ...BROWSER, Authorization: 'Bearer expired' },
      body: JSON.stringify({ target_text: 'x' }),
    })
    expect(res.status).toBe(401)
  })

  it('401s a Supabase account with no Popty access at all', async () => {
    // Authenticates fine; resolves to no dashboard_users row and no learners
    // row, so resolvePoptyIdentity returns null. Authenticated is not authorised.
    const sb = makeSupabase({ users: { [TOKEN]: { id: 'u2', email: 'stranger@example.com' } } })
    await listen(makeApp(sb))
    const res = await fetch(`${base}/api/seed/eng_for_hin/42`, {
      method: 'PATCH', headers: { ...BROWSER, Authorization: `Bearer ${TOKEN}` },
      body: JSON.stringify({ target_text: 'x' }),
    })
    expect(res.status).toBe(401)
  })

  it('leaves routes that do not write course content completely alone', async () => {
    await listen(makeApp(supabaseWithHuman()))
    const res = await fetch(`${base}/api/course/eng_for_hin/health-check`, { headers: BROWSER })
    expect(res.status).toBe(200)
    expect((await res.json()).gated).toBe(false)
  })
})

describe('the gate attributes a write it allows', () => {
  it('records a verified human from a Supabase session', async () => {
    const sb = supabaseWithHuman()
    await listen(makeApp(sb))

    const res = await fetch(`${base}/api/seed/eng_for_hin/42`, {
      method: 'PATCH', headers: { ...BROWSER, Authorization: `Bearer ${TOKEN}` },
      body: JSON.stringify({ target_text: 'x' }),
    })
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.identity).toMatchObject({ kind: 'human', label: 'Shuchita', verified: true, role: 'editor' })

    const event = sb.inserted.find(i => i.table === 'content_edit_events').row
    expect(event).toMatchObject({
      course_code: 'eng_for_hin',
      surface: 'course-builder:PATCH /api/seed/:courseCode/:seedNumber',
      actor_kind: 'human',
      actor_id: 'user-uuid-1',
      actor_label: 'Shuchita',
      actor_verified: true,
    })
    expect(event.scope).toEqual({ seed_numbers: [42] })
  })

  it('records a same-host agent as UNVERIFIED — a declaration, not a proof', async () => {
    const sb = supabaseWithHuman()
    await listen(makeApp(sb))
    const res = await fetch(`${base}/api/seed/eng_for_hin/42`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json', 'x-agent-role': 'checker', 'x-agent-id': 'pid-8812' },
      body: JSON.stringify({ target_text: 'x' }),
    })
    expect(res.status).toBe(200)
    const event = sb.inserted.find(i => i.table === 'content_edit_events').row
    expect(event.actor_kind).toBe('agent')
    expect(event.actor_id).toBe('pid-8812')
    expect(event.actor_verified, 'loopback is trusted transport, not proof of identity').toBe(false)
  })

  it('prefers the human when a request carries both a session and an agent header', async () => {
    const sb = supabaseWithHuman()
    await listen(makeApp(sb))
    await fetch(`${base}/api/seed/eng_for_hin/42`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json', Authorization: `Bearer ${TOKEN}`, 'x-agent-role': 'checker' },
      body: JSON.stringify({}),
    })
    const event = sb.inserted.find(i => i.table === 'content_edit_events').row
    expect(event.actor_kind).toBe('human')
  })

  it('records a default event when a handler forgets to record one', async () => {
    const sb = supabaseWithHuman()
    const app = express()
    app.use(express.json())
    app.use(contentEditGate({ supabase: sb, service: 'course-builder', logger: { warn() {}, error() {} } }))
    app.patch('/api/seed/:courseCode/:seedNumber', (req, res) => res.json({ ok: true }))
    await listen(app)

    await fetch(`${base}/api/seed/eng_for_hin/42`, {
      method: 'PATCH', headers: { ...BROWSER, Authorization: `Bearer ${TOKEN}` }, body: '{}',
    })
    await new Promise(r => setTimeout(r, 50)) // the safety net fires on res 'finish'
    const event = sb.inserted.find(i => i.table === 'content_edit_events')?.row
    expect(event, 'coverage must not depend on a handler remembering').toBeTruthy()
    expect(event.scope).toEqual({ recorded_by: 'gate-default' })
  })
})

describe('an internal hop joins the action it is part of', () => {
  const PARENT = '11111111-2222-3333-4444-555555555555'

  it('a same-host hop inherits the parent event instead of opening a second one', async () => {
    const sb = supabaseWithHuman()
    await listen(makeApp(sb))
    const res = await fetch(`${base}/api/seed/eng_for_hin/42`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json', 'x-service-name': 'edit-cascade', 'x-content-edit-event': PARENT },
      body: '{}',
    })
    expect((await res.json()).eventId).toBe(PARENT)
    expect(sb.inserted.filter(i => i.table === 'content_edit_events'),
      'edit-cascade re-posting to /seed/complete is one edit, not two').toHaveLength(0)
  })

  it('a remote caller cannot point its edit at somebody else\'s event', async () => {
    const sb = supabaseWithHuman()
    await listen(makeApp(sb))
    const res = await fetch(`${base}/api/seed/eng_for_hin/42`, {
      method: 'PATCH',
      headers: { ...BROWSER, Authorization: `Bearer ${TOKEN}`, 'x-content-edit-event': PARENT },
      body: '{}',
    })
    expect((await res.json()).eventId).not.toBe(PARENT)
    expect(sb.inserted.find(i => i.table === 'content_edit_events').row.actor_id).toBe('user-uuid-1')
  })

  it('ignores a malformed inherited event id rather than trusting it', async () => {
    const sb = supabaseWithHuman()
    await listen(makeApp(sb))
    const res = await fetch(`${base}/api/seed/eng_for_hin/42`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json', 'x-service-name': 'sweep', 'x-content-edit-event': "'; drop table --" },
      body: '{}',
    })
    expect((await res.json()).eventId).toMatch(/^evt-/)
  })
})

// initializeCourseSeeds lays down 668 course_seeds rows the first time anyone
// opens the translation view or the seed editor on an uninitialised course. It
// is a content write behind a GET, found by the 2026-09-01 sweep. Refusing a GET
// would break the editor for someone whose only sin is reading, so these
// surfaces record and never refuse.
describe('record-only surfaces: a read that writes', () => {
  it('never refuses, even with no identity at all', async () => {
    await listen(makeApp(supabaseWithHuman()))
    const res = await fetch(`${base}/api/course/eng_for_hin/seed-editor?initialise=1`, { headers: BROWSER })
    expect(res.status, 'a GET must not 401 — that would break the editor UI').toBe(200)
    expect((await res.json()).eventId, 'nothing honest to record, so nothing is recorded').toBe(null)
  })

  it('attributes the skeleton when the reader IS identified', async () => {
    const sb = supabaseWithHuman()
    await listen(makeApp(sb))
    const res = await fetch(`${base}/api/course/eng_for_hin/seed-editor?initialise=1`, {
      headers: { ...BROWSER, Authorization: `Bearer ${TOKEN}` },
    })
    expect(res.status).toBe(200)
    const event = sb.inserted.find(i => i.table === 'content_edit_events').row
    expect(event).toMatchObject({ operation: 'seed-initialise', actor_label: 'Shuchita', actor_verified: true })
    expect(event.scope).toEqual({ course_code: 'eng_for_hin', rows: 668 })
  })

  it('files nothing on the far commoner case: a plain read', async () => {
    const sb = supabaseWithHuman()
    await listen(makeApp(sb))
    await fetch(`${base}/api/course/eng_for_hin/seed-editor`, {
      headers: { ...BROWSER, Authorization: `Bearer ${TOKEN}` },
    })
    await new Promise(r => setTimeout(r, 50))
    expect(sb.inserted.filter(i => i.table === 'content_edit_events'),
      'every page load must not file an edit').toHaveLength(0)
  })
})

describe('the observe → enforce transition', () => {
  it('observe mode names an undeclared same-host caller instead of refusing it', async () => {
    const sb = supabaseWithHuman()
    await listen(makeApp(sb))
    const res = await fetch(`${base}/api/seed/eng_for_hin/42`, {
      method: 'PATCH', headers: { 'content-type': 'application/json' }, body: '{}',
    })
    expect(res.status).toBe(200)
    const event = sb.inserted.find(i => i.table === 'content_edit_events').row
    expect(event.actor_id).toBe('undeclared-loopback')
    expect(event.actor_verified).toBe(false)
    expect(event.actor_label.trim(), 'never blank, even in the transition').not.toBe('')
  })

  it('observe mode still refuses an undeclared BROWSER write — no loophole', async () => {
    await listen(makeApp(supabaseWithHuman()))
    const res = await fetch(`${base}/api/seed/eng_for_hin/42`, {
      method: 'PATCH', headers: BROWSER, body: '{}',
    })
    expect(res.status).toBe(401)
  })

  it('enforce mode refuses an undeclared same-host caller too', async () => {
    process.env.CONTENT_EDIT_IDENTITY_MODE = 'enforce'
    await listen(makeApp(supabaseWithHuman()))
    const res = await fetch(`${base}/api/seed/eng_for_hin/42`, {
      method: 'PATCH', headers: { 'content-type': 'application/json' }, body: '{}',
    })
    expect(res.status).toBe(401)
  })
})

describe('the log itself will not take a blank actor', () => {
  const sb = makeSupabase()

  it.each([
    ['no identity', undefined],
    ['null', null],
    ['blank label', { kind: 'human', id: 'u1', label: '   ', verified: true }],
    ['blank id', { kind: 'human', id: '', label: 'Someone', verified: true }],
    ['made-up kind', { kind: 'anonymous', id: 'x', label: 'x', verified: false }],
    ['missing verified flag', { kind: 'human', id: 'u1', label: 'Someone' }],
  ])('refuses %s', async (_name, identity) => {
    await expect(recordContentEdit(sb, {
      identity, courseCode: 'eng_for_hin', surface: 's', operation: 'update',
    })).rejects.toBeInstanceOf(EditorIdentityRequired)
  })

  it('will not let a script call itself nothing', () => {
    expect(() => serviceIdentity('')).toThrow(EditorIdentityRequired)
    expect(serviceIdentity('zut-membership-sweep')).toMatchObject({
      kind: 'service', id: 'zut-membership-sweep', verified: false,
    })
  })
})
