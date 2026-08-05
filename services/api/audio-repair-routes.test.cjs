/**
 * Route-level tests for the audio repair surface. No DB, no S3, no TTS, no
 * spend: the core is injected as a spy, so what is asserted here is the HTTP
 * wiring and — the part worth holding — the AUTH POSTURE.
 *
 * Run: npx vitest run services/api/audio-repair-routes
 */

import { describe, it, expect, beforeEach } from 'vitest'
import express from 'express'

const { mount } = require('./audio-repair-routes.cjs')

/**
 * A three-line stand-in for supertest — the repo does not carry it, and one
 * ephemeral listener per call is cheaper than a dependency. Returns the same
 * { status, headers, body } shape the assertions below expect.
 */
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
      return {
        status: res.status,
        headers: Object.fromEntries(res.headers.entries()),
        body: parsed,
        text,
      }
    } finally {
      await new Promise(r => server.close(r))
    }
  }
  const verb = (method) => (path) => {
    let sent
    const p = {
      send (body) { sent = call(method, path, body ?? {}); return sent },
      then (res, rej) { return (sent || call(method, path)).then(res, rej) },
    }
    return p
  }
  return { get: verb('GET'), post: verb('POST') }
}

function makeApp ({ admin = null, user = null, core = {} } = {}) {
  const app = express()
  app.use(express.json({ limit: '50mb' }))
  const calls = []
  const spy = (name, impl) => async (args) => { calls.push({ name, args }); return impl ? impl(args) : { ok: true } }

  const fakeCore = Object.assign({
    queue: spy('queue', () => ({ courseCode: 'deu_for_eng', detector: { name: 'd', precision: null }, total: 1, items: [{ audioId: 'a1', detector: { flagged: true } }] })),
    propose: spy('propose', () => ({ candidateId: 'c1', candidate: { durationMs: 4100 }, current: { id: 'a1', durationMs: 3200 } })),
    preview: spy('preview', () => ({ current: { id: 'a1' }, candidates: [{ candidateId: 'c1' }], detector: { name: 'd', precision: null } })),
    accept: spy('accept', () => ({ ok: true, audioId: 'a1', revision: 2 })),
    reject: spy('reject', () => ({ ok: true })),
    revert: spy('revert', () => ({ ok: true, audioId: 'a1', revision: 3, restoredS3Key: 'mastered/OLD.mp3' })),
    candidateBytes: spy('candidateBytes', () => ({ buffer: Buffer.from('mp3'), contentType: 'audio/mpeg' })),
    currentBytes: spy('currentBytes', () => ({ buffer: Buffer.from('mp3'), contentType: 'audio/mpeg' })),
  }, core)

  mount(app, {
    core: fakeCore,
    logger: { log () {}, warn () {}, error () {} },
    requireAdmin: async (req, res) => {
      if (!admin) { res.status(403).json({ error: 'Admin access required' }); return null }
      return admin
    },
    requireDashboardUser: async (req, res) => {
      const u = user || admin
      if (!u) { res.status(401).json({ error: 'Authentication required' }); return null }
      return u
    },
  })
  return { app, calls }
}

const ADMIN = { email: 'tom@saysomethingin.com' }
const PRODUCER = { email: 'recorder@saysomethingin.com' }

describe('audio repair routes — auth posture', () => {
  it('a TTS propose is admin-only, because it spends money', async () => {
    const { app } = makeApp({ user: PRODUCER })
    const r = await request(app).post('/api/audio/repair/deu_for_eng/a1/propose').send({ source: 'tts' })
    expect(r.status).toBe(403)
  })

  it('an upload propose is open to any dashboard user, because it spends nothing', async () => {
    const { app, calls } = makeApp({ user: PRODUCER })
    const r = await request(app).post('/api/audio/repair/deu_for_eng/a1/propose')
      .send({ source: 'upload', audioBase64: Buffer.from('wavbytes').toString('base64'), filename: 'take3.wav' })
    expect(r.status).toBe(200)
    expect(calls.find(c => c.name === 'propose').args.actor).toBe(PRODUCER.email)
  })

  it('accept is admin-only — it is the moment audio reaches learners', async () => {
    const { app } = makeApp({ user: PRODUCER })
    const r = await request(app).post('/api/audio/repair/deu_for_eng/a1/accept').send({ candidateId: 'c1' })
    expect(r.status).toBe(403)
  })

  it('reject is open — it cannot touch the learner path', async () => {
    const { app } = makeApp({ user: PRODUCER })
    const r = await request(app).post('/api/audio/repair/deu_for_eng/a1/reject').send({ candidateId: 'c1' })
    expect(r.status).toBe(200)
  })

  it('revert is admin-only — it moves what learners hear, same as accept', async () => {
    const { app } = makeApp({ user: PRODUCER })
    expect((await request(app).post('/api/audio/repair/deu_for_eng/a1/revert').send({})).status).toBe(403)
  })

  it('reads require a dashboard user', async () => {
    const { app } = makeApp({})
    expect((await request(app).get('/api/audio/repair/deu_for_eng/queue')).status).toBe(401)
    expect((await request(app).get('/api/audio/repair/deu_for_eng/a1/preview')).status).toBe(401)
  })
})

describe('audio repair routes — behaviour', () => {
  let app, calls
  beforeEach(() => { ({ app, calls } = makeApp({ admin: ADMIN })) })

  it('accept records WHO accepted — the history row is only worth having if it names a person', async () => {
    await request(app).post('/api/audio/repair/deu_for_eng/a1/accept')
      .send({ candidateId: 'c1', reason: 'clipped final word' })
    const c = calls.find(x => x.name === 'accept')
    expect(c.args.actor).toBe(ADMIN.email)
    expect(c.args.reason).toBe('clipped final word')
  })

  it('accept without a candidateId is refused before the core is called', async () => {
    const r = await request(app).post('/api/audio/repair/deu_for_eng/a1/accept').send({})
    expect(r.status).toBe(400)
    expect(calls.find(x => x.name === 'accept')).toBeUndefined()
  })

  it('an upload with no bytes is refused before the core is called', async () => {
    const r = await request(app).post('/api/audio/repair/deu_for_eng/a1/propose').send({ source: 'upload' })
    expect(r.status).toBe(400)
    expect(calls.find(x => x.name === 'propose')).toBeUndefined()
  })

  it('strips a data: prefix so a browser FileReader result works as-is', async () => {
    await request(app).post('/api/audio/repair/deu_for_eng/a1/propose').send({
      source: 'upload', filename: 'take3.wav',
      audioBase64: 'data:audio/wav;base64,' + Buffer.from('hello').toString('base64'),
    })
    expect(calls.find(x => x.name === 'propose').args.buffer.toString()).toBe('hello')
  })

  it('the queue carries the detector and its precision, always', async () => {
    const r = await request(app).get('/api/audio/repair/deu_for_eng/queue')
    expect(r.status).toBe(200)
    expect(r.body.detector).toBeDefined()
    expect('precision' in r.body.detector).toBe(true)
  })

  it('preview hands back playable URLs for current and candidate', async () => {
    const r = await request(app).get('/api/audio/repair/deu_for_eng/a1/preview')
    expect(r.body.current.url).toBe('/api/audio/repair/deu_for_eng/a1/current-audio')
    expect(r.body.candidates[0].url).toBe('/api/audio/repair/candidate/c1/audio')
  })

  it('candidate audio is served no-store, so a producer always hears what they are deciding on', async () => {
    const r = await request(app).get('/api/audio/repair/candidate/c1/audio')
    expect(r.status).toBe(200)
    expect(r.headers['cache-control']).toBe('no-store')
  })

  it('surfaces the core\'s status code and error code rather than a blanket 500', async () => {
    const { RepairError } = require('../audio-repair-core.cjs')
    const { app: a2 } = makeApp({
      admin: ADMIN,
      core: { accept: async () => { throw new RepairError('no candidate c9', 'not_found', 404) } },
    })
    const r = await request(a2).post('/api/audio/repair/deu_for_eng/a1/accept').send({ candidateId: 'c9' })
    expect(r.status).toBe(404)
    expect(r.body.code).toBe('not_found')
  })

  it('reports the rollback outcome when an accept fails mid-swap', async () => {
    const { RepairError } = require('../audio-repair-core.cjs')
    const { app: a2 } = makeApp({
      admin: ADMIN,
      core: { accept: async () => { const e = new RepairError('link census moved', 'assert_links'); e.rollback = 'restored'; throw e } },
    })
    const r = await request(a2).post('/api/audio/repair/deu_for_eng/a1/accept').send({ candidateId: 'c1' })
    expect(r.body.rollback).toBe('restored')
  })
})
