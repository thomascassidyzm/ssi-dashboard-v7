/**
 * docs-router.test.cjs — pins the routes, methods and ordering of the docs
 * family lifted out of production-api.cjs (job #101): /list must win over
 * /:slug, 503 before the DB is up, 404 for an unknown slug. The router gets
 * its supabase client and logger passed in, so this mounts it with doubles.
 *
 * Run: npx vitest run services/docs-router
 */
import { describe, it, expect } from 'vitest'
import express from 'express'
const docsRouter = require('./docs-router.cjs')

async function get (app, path) {
  const server = app.listen(0)
  await new Promise(r => server.once('listening', r))
  try {
    const res = await fetch(`http://127.0.0.1:${server.address().port}${path}`)
    return { status: res.status, body: await res.json() }
  } finally {
    await new Promise(r => server.close(r))
  }
}

const quietLogger = { error () {}, log () {}, info () {} }

function appWith (supabaseClient) {
  const app = express()
  app.use('/api/docs', docsRouter({ supabaseClient, logger: quietLogger }))
  return app
}

describe('docs router', () => {
  it('serves /api/docs/list from getDocumentationList, not the :slug route', async () => {
    const calls = []
    const app = appWith({
      isInitialized: () => true,
      getDocumentationList: async (category) => { calls.push(['list', category]); return [{ slug: 'a' }] },
      getDocumentation: async (slug) => { calls.push(['doc', slug]); return null },
    })
    const r = await get(app, '/api/docs/list?category=guides')
    expect(r.status).toBe(200)
    expect(r.body).toEqual({ success: true, count: 1, documents: [{ slug: 'a' }] })
    expect(calls).toEqual([['list', 'guides']])
  })

  it('serves /api/docs/:slug and 404s an unknown document', async () => {
    const app = appWith({
      isInitialized: () => true,
      getDocumentationList: async () => [],
      getDocumentation: async (slug) => (slug === 'known' ? { slug, sections: [] } : null),
    })
    expect((await get(app, '/api/docs/known')).body).toEqual({ success: true, document: { slug: 'known', sections: [] } })
    const miss = await get(app, '/api/docs/nope')
    expect(miss.status).toBe(404)
    expect(miss.body).toEqual({ error: 'Document not found', slug: 'nope' })
  })

  it('answers 503 on both routes before the database is initialised', async () => {
    const app = appWith({ isInitialized: () => false })
    expect((await get(app, '/api/docs/list')).status).toBe(503)
    expect((await get(app, '/api/docs/anything')).status).toBe(503)
  })
})
