/**
 * release-notes-router.test.cjs — pins the three release-notes routes lifted
 * out of production-api.cjs (job #101) and the one thing that must not be lost
 * in a lift: every route sits behind requireAdmin. The guard is passed in, so
 * the test proves the service is never reached when the guard says no.
 *
 * Run: npx vitest run services/release-notes-router
 */
import { describe, it, expect } from 'vitest'
import express from 'express'
const releaseNotesRouter = require('./release-notes-router.cjs')

async function call (app, method, path, body) {
  const server = app.listen(0)
  await new Promise(r => server.once('listening', r))
  try {
    const res = await fetch(`http://127.0.0.1:${server.address().port}${path}`, {
      method,
      headers: body === undefined ? {} : { 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
    })
    return { status: res.status, body: await res.json() }
  } finally {
    await new Promise(r => server.close(r))
  }
}

const quietLogger = { error () {}, log () {}, info () {} }

function build ({ admin }) {
  const svcCalls = []
  const releaseNotes = {
    generateDraft: async (opts) => { svcCalls.push(['generate', opts]); return { id: 1, version: 'abc', commitCount: 3 } },
    publishNote: async (opts) => { svcCalls.push(['publish', opts]); return { id: opts.id, version: 'abc' } },
    listDrafts: async () => { svcCalls.push(['drafts']); return [{ id: 1 }] },
  }
  const requireAdmin = async (req, res) => {
    if (admin) return admin
    res.status(401).json({ error: 'Unauthorized' })
    return null
  }
  const app = express()
  app.use(express.json())
  app.use('/api/release-notes', releaseNotesRouter({ requireAdmin, logger: quietLogger, releaseNotes }))
  return { app, svcCalls }
}

describe('release-notes router', () => {
  it('refuses all three routes to a non-admin without touching the service', async () => {
    const { app, svcCalls } = build({ admin: null })
    expect((await call(app, 'POST', '/api/release-notes/generate', {})).status).toBe(401)
    expect((await call(app, 'POST', '/api/release-notes/publish', { id: 1 })).status).toBe(401)
    expect((await call(app, 'GET', '/api/release-notes/drafts')).status).toBe(401)
    expect(svcCalls).toEqual([])
  })

  it('generates a draft, passing a trimmed version only when one is given', async () => {
    const { app, svcCalls } = build({ admin: { email: 'tom@example.com' } })
    expect((await call(app, 'POST', '/api/release-notes/generate', {})).body).toEqual({ id: 1, version: 'abc', commitCount: 3 })
    await call(app, 'POST', '/api/release-notes/generate', { version: ' deadbeef ' })
    expect(svcCalls).toEqual([['generate', {}], ['generate', { version: 'deadbeef' }]])
  })

  it('publish needs an id; drafts lists the unpublished rows', async () => {
    const { app, svcCalls } = build({ admin: { id: 'u1' } })
    expect((await call(app, 'POST', '/api/release-notes/publish', {})).status).toBe(400)
    expect((await call(app, 'POST', '/api/release-notes/publish', { id: 7, headline: 'h' })).body).toEqual({ id: 7, version: 'abc' })
    expect((await call(app, 'GET', '/api/release-notes/drafts')).body).toEqual({ drafts: [{ id: 1 }] })
    expect(svcCalls).toEqual([['publish', { id: 7, headline: 'h', bullets: undefined }], ['drafts']])
  })
})
