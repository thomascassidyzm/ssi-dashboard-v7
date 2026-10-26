// Job #709 (Aran 2026-10-15): "Edit this line" in the booth. Proves, on the real router with a
// faked database and a faked edit door:
//   - the server refuses everyone but a God admin (no token 401, recordist 403, plain admin 403),
//     and reads nothing and calls no door for them;
//   - a live course's line is read-only ("editing live courses: ask Tom"), and preview/apply refuse;
//   - preview is the door's DRY RUN (no "apply"), apply is "apply": true with the before-state;
//   - Aran's re-record rule: changed words leave the takes to the door (unlinked → re-queued), a
//     punctuation-only edit links every take straight back in the same transaction;
//   - the tiling check runs the course-builder's own checkTiling.
// Run: node --test services/voice-engine/booth-line-edit-router.test.cjs
'use strict'

const test = require('node:test')
const assert = require('node:assert')
const express = require('express')

const createRouter = require('./booth-line-edit-router.cjs')
const rules = require('./booth-line-edit.cjs')

const SEED_ID = '11111111-1111-4111-8111-111111111111'
const LIVE_SEED_ID = '22222222-2222-4222-8222-222222222222'
const TABLES = {
  course_seeds: [
    { id: SEED_ID, course_code: 'cym_nv2_for_eng', seed_number: 3, target_text: 'Dw i isio mynd', known_text: 'I want to go', status: 'draft', known_audio_id: 'k-1', target1_audio_id: 't1-1', target2_audio_id: 't2-1' },
    { id: LIVE_SEED_ID, course_code: 'cym_n_for_eng', seed_number: 3, target_text: 'Dw i isio mynd', known_text: 'I want to go', status: 'released', known_audio_id: null, target1_audio_id: null, target2_audio_id: null },
  ],
  course_legos: [
    { id: 'l-1', course_code: 'cym_nv2_for_eng', seed_number: 1, target_text: 'dw i isio', type: 'A', components: null },
    { id: 'l-2', course_code: 'cym_nv2_for_eng', seed_number: 3, target_text: 'mynd', type: 'A', components: null },
  ],
  course_practice_phrases: [],
}
let reads = 0
function fakeDb() {
  return {
    from(table) {
      reads += 1
      const filters = []
      const q = {
        select: () => q,
        eq: (c, v) => { filters.push((r) => r[c] === v); return q },
        lte: (c, v) => { filters.push((r) => r[c] <= v); return q },
        order: () => q,
        rows: () => (TABLES[table] || []).filter((r) => filters.every((f) => f(r))),
        maybeSingle: async () => ({ data: q.rows()[0] || null, error: null }),
        range: async () => ({ data: q.rows(), error: null }),
      }
      return q
    },
  }
}

const USERS = {
  aran: { email: 'aran@hey.com', role: 'admin' },
  tom: { email: 'thomas.cassidy+ssi@gmail.com', role: 'admin' },
  nick: { email: 'nick@saysomethingin.com', role: 'admin' },
  catrin: { email: 'catrinlliar@gmail.com', role: 'recorder' },
}
async function requireAdmin(req, res) {
  const who = (req.headers.authorization || '').replace('Bearer ', '')
  if (!who) { res.status(401).json({ error: 'Authentication required' }); return null }
  const user = USERS[who]
  if (!user || user.role !== 'admin') { res.status(403).json({ error: 'Admin access required' }); return null }
  return user
}

// THE DOOR, as course-edit-ops answers: before/after per op, the trigger's effect on the audio
// slots included — a target_text change whose words moved NULLs target1/target2.
function fakeDoor() {
  const calls = []
  const doorFetch = async (url, init) => {
    const body = JSON.parse(init.body)
    calls.push({ url, body, auth: init.headers.Authorization })
    if (body.undo_file) return { ok: true, status: 200, json: async () => ({ ok: true, applied: true, event_id: 'ev-undo', results: [] }) }
    const row = { ...TABLES.course_seeds[0] }
    const results = []
    let cur = { ...row }
    for (const op of body.ops) {
      const before = { ...cur }
      if (op.op === 'seed.update') {
        Object.assign(cur, op.set)
        if ('target_text' in op.set && rules.wordsChanged(before.target_text, op.set.target_text)) { cur.target1_audio_id = null; cur.target2_audio_id = null }
        if ('target_text' in op.set && !rules.wordsChanged(before.target_text, op.set.target_text)) { cur.target1_audio_id = null } // the trigger's inside-punctuation miss
      }
      if (op.op === 'audio.link') cur[`${op.slot}_audio_id`] = op.audio_id
      results.push({ op: op.op, before, after: { ...cur } })
    }
    return { ok: true, status: 200, json: async () => ({ ok: true, dryRun: !body.apply, applied: !!body.apply, results, event_id: body.apply ? 'ev-1' : null, undo_file: body.apply ? '2026-10-15-ev-1.json' : null }) }
  }
  return { calls, doorFetch }
}

async function call(method, path, who, body, door = fakeDoor()) {
  const app = express()
  app.use('/api/recording/admin/line-edit', createRouter({
    getDb: fakeDb, requireAdmin, doorFetch: door.doorFetch, logger: { info() {}, warn() {}, error() {} },
  }))
  const server = app.listen(0)
  try {
    const r = await fetch(`http://127.0.0.1:${server.address().port}/api/recording/admin/line-edit${path}`, {
      method,
      headers: { 'Content-Type': 'application/json', ...(who ? { Authorization: `Bearer ${who}` } : {}) },
      body: body ? JSON.stringify(body) : undefined,
    })
    return { status: r.status, json: await r.json(), door }
  } finally { server.close() }
}
const line = (id) => `/line/${encodeURIComponent(`seed:${id}:target1`)}`

test('the server refuses everyone but a God admin, and reads nothing for them', async () => {
  reads = 0
  for (const [who, status] of [[null, 401], ['catrin', 403], ['nick', 403]]) {
    const door = fakeDoor()
    assert.strictEqual((await call('GET', '/', who, null, door)).status, status, `GET / as ${who}`)
    assert.strictEqual((await call('POST', `${line(SEED_ID)}/preview`, who, { targetText: 'Dw i isio aros' }, door)).status, status)
    assert.strictEqual((await call('POST', `${line(SEED_ID)}/apply`, who, { targetText: 'Dw i isio aros' }, door)).status, status)
    assert.strictEqual(door.calls.length, 0, `no door call for ${who}`)
  }
  assert.strictEqual(reads, 0)
  assert.strictEqual((await call('GET', '/', 'aran')).status, 200)
  assert.strictEqual((await call('GET', '/', 'tom')).status, 200)
})

test('a live course line is read-only, and preview/apply refuse it without touching the door', async () => {
  const got = await call('GET', line(LIVE_SEED_ID), 'aran')
  assert.strictEqual(got.status, 200)
  assert.strictEqual(got.json.editable, false)
  assert.strictEqual(got.json.note, 'editing live courses: ask Tom')
  for (const step of ['preview', 'apply']) {
    const door = fakeDoor()
    const r = await call('POST', `${line(LIVE_SEED_ID)}/${step}`, 'aran', { targetText: 'Dw i isio aros' }, door)
    assert.strictEqual(r.status, 403)
    assert.strictEqual(r.json.reason, 'live_course')
    assert.strictEqual(door.calls.length, 0)
  }
  const relaunch = await call('GET', line(SEED_ID), 'aran')
  assert.strictEqual(relaunch.json.editable, true)
  assert.strictEqual(relaunch.json.targetText, 'Dw i isio mynd')
  assert.strictEqual(relaunch.json.knownText, 'I want to go')
})

test('preview is the door dry run; apply sends apply:true with the before-state, as the caller', async () => {
  const pre = await call('POST', `${line(SEED_ID)}/preview`, 'aran', { targetText: 'Dw i isio aros' })
  assert.strictEqual(pre.status, 200)
  assert.strictEqual(pre.json.dryRun, true)
  assert.strictEqual(pre.door.calls.length, 1)
  assert.strictEqual(pre.door.calls[0].body.apply, undefined)
  assert.match(pre.door.calls[0].url, /\/api\/production\/cym_nv2_for_eng\/edit-batch$/)
  assert.strictEqual(pre.door.calls[0].auth, 'Bearer aran')
  assert.deepStrictEqual(pre.door.calls[0].body.ops[0], {
    op: 'seed.update', seed_number: 3, set: { target_text: 'Dw i isio aros' }, expect: { target_text: 'Dw i isio mynd' },
  })

  const ap = await call('POST', `${line(SEED_ID)}/apply`, 'aran', { targetText: 'Dw i isio aros' })
  assert.strictEqual(ap.status, 200)
  assert.strictEqual(ap.door.calls[0].body.apply, true)
  assert.strictEqual(ap.json.undoFile, '2026-10-15-ev-1.json')

  const undo = await call('POST', '/undo', 'aran', { courseCode: 'cym_nv2_for_eng', undoFile: ap.json.undoFile })
  assert.strictEqual(undo.status, 200)
  assert.deepStrictEqual(undo.door.calls[0].body, { undo_file: '2026-10-15-ev-1.json', apply: true })
  assert.strictEqual((await call('POST', '/undo', 'aran', { courseCode: 'cym_n_for_eng', undoFile: 'x.json' })).status, 403)
})

test("Aran's rule: changed words re-queue both Welsh takes; punctuation-only keeps every take", async () => {
  const words = await call('POST', `${line(SEED_ID)}/preview`, 'aran', { targetText: 'Dw i isio aros' })
  assert.deepStrictEqual(words.json.recordings.map((r) => [r.slot, r.fate]), [['target1', 'requeued'], ['target2', 'requeued'], ['known', 'kept']])
  assert.ok(!words.door.calls[0].body.ops.some((o) => o.op === 'audio.link'))

  const punct = await call('POST', `${line(SEED_ID)}/preview`, 'aran', { targetText: 'Dw i, isio mynd!' })
  assert.deepStrictEqual(punct.door.calls[0].body.ops.filter((o) => o.op === 'audio.link').map((o) => [o.slot, o.audio_id, o.allow_text_mismatch]),
    [['target1', 't1-1', true], ['target2', 't2-1', true]])
  assert.deepStrictEqual(punct.json.recordings.map((r) => [r.slot, r.fate]), [['target1', 'kept'], ['target2', 'kept'], ['known', 'kept']])
})

test('the tiling check says whether the seed still tiles from its LEGOs', async () => {
  const ok = await call('POST', `${line(SEED_ID)}/preview`, 'aran', { targetText: 'Dw i isio mynd!' })
  assert.strictEqual(ok.json.tiling.valid, true)
  const bad = await call('POST', `${line(SEED_ID)}/preview`, 'aran', { targetText: 'Dw i isio aros' })
  assert.strictEqual(bad.json.tiling.valid, false)
  assert.match(bad.json.tiling.untiled, /aros/)
  const known = await call('POST', `${line(SEED_ID)}/preview`, 'aran', { knownText: 'I want to leave' })
  assert.strictEqual(known.json.tiling.checked, false)
  assert.strictEqual((await call('POST', `${line(SEED_ID)}/preview`, 'aran', { targetText: 'Dw i isio mynd' })).json.reason, 'no_change')
})

test('spokenWords: capitals and punctuation are not words', () => {
  assert.strictEqual(rules.wordsChanged('Bore da, Aran.', 'bore da Aran'), false)
  assert.strictEqual(rules.wordsChanged("Dw i'n mynd", 'Dw i’n mynd!'), false)
  assert.strictEqual(rules.wordsChanged('Bore da', 'Bore da iawn'), true)
})
