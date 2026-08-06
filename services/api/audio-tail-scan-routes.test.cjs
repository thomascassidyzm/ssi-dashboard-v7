/**
 * Route-level tests for the tail-scan surface. No DB, no S3, no ffmpeg, no
 * spend: the scan store is injected as a spy, so what is asserted here is the
 * HTTP wiring, the AUTH POSTURE, and the two things this surface promises never
 * to do — write anything, and serve a flag count without saying what it means.
 *
 * Run: npx vitest run services/api/audio-tail-scan-routes
 */

import { describe, it, expect } from 'vitest'
import express from 'express'

const { mount } = require('./audio-tail-scan-routes.cjs')

/** Same three-line stand-in for supertest as audio-repair-routes.test.cjs. */
function request (app) {
  const call = async (method, path, body) => {
    const server = app.listen(0)
    await new Promise(r => server.once('listening', r))
    try {
      const res = await fetch(`http://127.0.0.1:${server.address().port}${path}`, {
        method,
        headers: body === undefined ? {} : { 'Content-Type': 'application/json' },
        body: body === undefined ? undefined : JSON.stringify(body),
      })
      const text = await res.text()
      let parsed = text
      try { parsed = JSON.parse(text) } catch {}
      return { status: res.status, headers: Object.fromEntries(res.headers.entries()), body: parsed }
    } finally {
      await new Promise(r => server.close(r))
    }
  }
  const verb = (method) => (path) => ({
    send (body) { return call(method, path, body ?? {}) },
    then (res, rej) { return call(method, path).then(res, rej) },
  })
  return { get: verb('GET'), post: verb('POST') }
}

const FLAG_MEANING = {
  headline: 'A flag means the clip was TRIMMED — not that it is unusable.',
  precision: 'On the 20 clips a human has listened to, 16 were audibly damaged and 4 were trimmed harmlessly.',
  authority: 'Triage only.',
  calibration: 'Read the per-voice flag rate first.',
}

const STATUS = {
  jobId: 'j1', courseCode: 'deu_for_eng', status: 'done',
  progress: { phase: 'done', done: 120, total: 120 },
  detector: { name: 'edge-shape', precision: 0.8 },
  flagMeaning: FLAG_MEANING,
  totals: { flagged: 3, flaggedByTail: 2, flaggedByDuration: 2, measured: 120, measureFailures: 2, excludedUnrendered: 7, reported: 3, truncated: 0 },
  tailByVoice: { eve: { measured: 100, flagged: 2, failed: 0, flagRate: 0.02 } },
  items: null,
}

function makeApp ({ user = null, store = {}, gate = {} } = {}) {
  const app = express()
  app.use(express.json())
  const calls = []
  const spy = (name, impl) => (...args) => { calls.push({ name, args }); return impl ? impl(...args) : { ok: true } }

  const fakeStore = Object.assign({
    start: spy('start', () => ({ id: 'j1' })),
    get: spy('get', () => STATUS),
    report: spy('report', () => ({
      ...STATUS, matched: 2, offset: 0, limit: 200,
      items: [{ audioId: 'a1', text: 'ich will Deutsch lernen', categories: ['tail-truncation'] }],
    })),
    list: spy('list', () => ({ jobs: [STATUS], detector: STATUS.detector, flagMeaning: FLAG_MEANING, stateNote: 'in-process' })),
    raw: spy('raw', () => ({ id: 'j1', courseCode: 'deu_for_eng' })),
    latestFinished: spy('latestFinished', () => ({ id: 'j1', finishedAt: '2026-08-06T00:00:00Z', scope: {} })),
    flagRowsFromScan: spy('flagRowsFromScan', () => [{ audio_id: 'a1', source: 'detector', severity: 'suspect' }]),
    verdictsByAudioId: spy('verdictsByAudioId', () => ({ a1: { categories: ['tail-truncation'] }, a2: { categories: ['duration'] } })),
    DETECTOR: STATUS.detector,
    FLAG_MEANING,
  }, store)

  const fakeGate = Object.assign({
    raiseDetectorFlags: spy('raiseDetectorFlags', () => ({
      courseCode: 'deu_for_eng', raised: 1, alreadyOpen: 0, clearedAlready: 0, flags: [{ id: 'f1', audio_id: 'a1' }],
    })),
  }, gate)

  mount(app, {
    store: fakeStore,
    gate: fakeGate,
    logger: { log () {}, warn () {}, error () {} },
    requireDashboardUser: async (req, res) => {
      if (!user) { res.status(401).json({ error: 'Authentication required' }); return null }
      return user
    },
  })
  return { app, calls }
}

const PRODUCER = { email: 'recorder@saysomethingin.com' }

describe('tail-scan routes — auth posture', () => {
  it('a scan is a read, so any dashboard user may start one — it is not admin-only', async () => {
    const { app, calls } = makeApp({ user: PRODUCER })
    const r = await request(app).post('/api/audio/tail-scan/deu_for_eng').send({ maxSeedNumber: 2 })
    expect(r.status).toBe(200)
    expect(calls.find(c => c.name === 'start').args[0]).toMatchObject({
      courseCode: 'deu_for_eng', maxSeedNumber: 2, actor: PRODUCER.email,
    })
  })

  it('every route needs a dashboard user', async () => {
    const { app } = makeApp({})
    expect((await request(app).post('/api/audio/tail-scan/deu_for_eng').send({})).status).toBe(401)
    expect((await request(app).get('/api/audio/tail-scan/jobs/j1')).status).toBe(401)
    expect((await request(app).get('/api/audio/tail-scan/jobs/j1/report')).status).toBe(401)
    expect((await request(app).get('/api/audio/tail-scan/deu_for_eng/jobs')).status).toBe(401)
    expect((await request(app).get('/api/audio/tail-scan/deu_for_eng/verdicts')).status).toBe(401)
  })
})

describe('tail-scan routes — behaviour', () => {
  it('a poll carries the counts, the per-voice rate and what a flag means — never bare numbers', async () => {
    const { app } = makeApp({ user: PRODUCER })
    const r = await request(app).get('/api/audio/tail-scan/jobs/j1')
    expect(r.status).toBe(200)
    expect(r.body.totals.flaggedByTail).toBe(2)
    expect(r.body.tailByVoice.eve.flagRate).toBe(0.02)
    expect(r.body.flagMeaning.headline).toMatch(/TRIMMED/)
    expect(r.body.detector.precision).toBe(0.8)
  })

  it('every reported clip is playable through the repair surface, not a second byte route', async () => {
    const { app } = makeApp({ user: PRODUCER })
    const r = await request(app).get('/api/audio/tail-scan/jobs/j1/report?category=tail-truncation')
    expect(r.body.items[0].url).toBe('/api/audio/repair/deu_for_eng/a1/current-audio')
  })

  it('passes the report filters through rather than filtering in the route', async () => {
    const { app, calls } = makeApp({ user: PRODUCER })
    await request(app).get('/api/audio/tail-scan/jobs/j1/report?category=duration&voiceId=ara&limit=10&offset=20')
    expect(calls.find(c => c.name === 'report').args[1])
      .toMatchObject({ category: 'duration', voiceId: 'ara', limit: '10', offset: '20' })
  })

  it('the gate seam hands back rows and says, in the payload, that it wrote none', async () => {
    const { app, calls } = makeApp({ user: PRODUCER })
    const r = await request(app).get('/api/audio/tail-scan/jobs/j1/flag-rows')
    expect(r.status).toBe(200)
    expect(r.body.table).toBe('audio_clip_flags')
    expect(r.body.written).toBe(false)
    expect(r.body.rows[0].source).toBe('detector')
    // Attributed to whoever asked, so an eventual insert names a person.
    expect(calls.find(c => c.name === 'flagRowsFromScan').args[1]).toBe(PRODUCER.email)
  })

  it('flag-rows on an unfinished job fails the same way the report does', async () => {
    const err = Object.assign(new Error('scan j1 is running — no report yet'), { status: 409, code: 'not_finished' })
    const { app } = makeApp({
      user: PRODUCER, store: { report: () => { throw err } },
    })
    const r = await request(app).get('/api/audio/tail-scan/jobs/j1/flag-rows')
    expect(r.status).toBe(409)
    expect(r.body.code).toBe('not_finished')
  })

  it('a lost job surfaces the store\'s 404 and its code, not a blanket 500', async () => {
    const err = Object.assign(new Error('no scan job j9'), { status: 404, code: 'unknown_job' })
    const { app } = makeApp({ user: PRODUCER, store: { get: () => { throw err } } })
    const r = await request(app).get('/api/audio/tail-scan/jobs/j9')
    expect(r.status).toBe(404)
    expect(r.body.code).toBe('unknown_job')
  })

  it('a second concurrent scan is refused with the store\'s 409', async () => {
    const err = Object.assign(new Error('a scan of deu_for_eng is already running (job j1)'),
      { status: 409, code: 'scan_in_progress' })
    const { app } = makeApp({ user: PRODUCER, store: { start: () => { throw err } } })
    const r = await request(app).post('/api/audio/tail-scan/deu_for_eng').send({})
    expect(r.status).toBe(409)
    expect(r.body.code).toBe('scan_in_progress')
  })

  it('verdicts answer for the ids asked for, from the newest finished scan', async () => {
    const { app } = makeApp({ user: PRODUCER })
    const r = await request(app).get('/api/audio/tail-scan/deu_for_eng/verdicts?audioIds=a1,missing')
    expect(r.body.jobId).toBe('j1')
    expect(Object.keys(r.body.verdicts)).toEqual(['a1'])
    // Absence is never a pass, and the payload says so.
    expect(r.body.note).toMatch(/never "passed"/)
  })

  it('verdicts with no scan in this process say so rather than returning a clean-looking empty', async () => {
    const { app } = makeApp({ user: PRODUCER, store: { latestFinished: () => null } })
    const r = await request(app).get('/api/audio/tail-scan/deu_for_eng/verdicts')
    expect(r.body.jobId).toBeNull()
    expect(r.body.note).toMatch(/do not survive a restart/)
  })
})

// ── raising the detector's findings into the approval gate ──────────────────
//
// The one write on this surface. It exists because a finding that dies with the
// scan process cannot be the machine proof-of-quality step feeding the manual
// gate — but a scan is still not allowed to pass, repair or delete anything, and
// these tests are where that line is held.

describe('tail-scan routes — raise-flags', () => {
  it('needs a logged-in user, like everything else here', async () => {
    const { app } = makeApp({ user: null })
    const res = await request(app).post('/api/audio/tail-scan/jobs/j1/raise-flags')
    expect(res.status).toBe(401)
  })

  it('writes through the GATE, never into the flags table itself', async () => {
    // One module owns audio_clip_flags. If this surface ever grew its own insert
    // there would be two places deciding what a flag may be, and they would drift.
    const { app, calls } = makeApp({ user: PRODUCER })
    const res = await request(app).post('/api/audio/tail-scan/jobs/j1/raise-flags')
    expect(res.status).toBe(200)
    const raised = calls.find(c => c.name === 'raiseDetectorFlags')
    expect(raised).toBeTruthy()
    expect(raised.args[0].courseCode).toBe('deu_for_eng')
    expect(raised.args[0].rows[0].source).toBe('detector')
  })

  it('names the person who pressed it, not just the machine', async () => {
    const { app, calls } = makeApp({ user: PRODUCER })
    await request(app).post('/api/audio/tail-scan/jobs/j1/raise-flags')
    expect(calls.find(c => c.name === 'raiseDetectorFlags').args[0].actor)
      .toBe('recorder@saysomethingin.com')
    // and the rows were built for that person too
    expect(calls.find(c => c.name === 'flagRowsFromScan').args[1])
      .toBe('recorder@saysomethingin.com')
  })

  it('says it wrote, and reports the three counts separately', async () => {
    // raised / alreadyOpen / clearedAlready mean different things; collapsing them
    // into one number is how a re-run starts looking like new damage.
    const { app } = makeApp({
      user: PRODUCER,
      gate: { raiseDetectorFlags: () => ({ courseCode: 'deu_for_eng', raised: 2, alreadyOpen: 5, clearedAlready: 1, flags: [] }) },
    })
    const res = await request(app).post('/api/audio/tail-scan/jobs/j1/raise-flags')
    expect(res.body.written).toBe(true)
    expect(res.body).toMatchObject({ raised: 2, alreadyOpen: 5, clearedAlready: 1 })
    expect(res.body.note).toMatch(/already been cleared by a human/i)
    expect(res.body.note).toMatch(/annotations, never changes to audio/i)
  })

  it('refuses a job that is not finished, the same way report does', async () => {
    const { app } = makeApp({
      user: PRODUCER,
      store: { report: () => { const e = new Error('scan still running'); e.status = 409; e.code = 'not_finished'; throw e } },
    })
    const res = await request(app).post('/api/audio/tail-scan/jobs/j1/raise-flags')
    expect(res.status).toBe(409)
    expect(res.body.code).toBe('not_finished')
  })

  it('the preview route still writes nothing, and points at the one that does', async () => {
    const { app } = makeApp({ user: PRODUCER })
    const res = await request(app).get('/api/audio/tail-scan/jobs/j1/flag-rows')
    expect(res.body.written).toBe(false)
    expect(res.body.note).toMatch(/raise-flags/)
  })
})
