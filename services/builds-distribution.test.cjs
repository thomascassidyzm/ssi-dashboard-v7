// The check that fails if popty.app/builds starts serving HTML where a binary
// belongs. That is not a hypothetical: before this router existed, /builds and
// every path under it returned the 669-byte dashboard shell with HTTP 200,
// because vercel.json's catch-all rewrite swallows anything it does not know.
// Two jobs recorded that URL as a working distribution surface. A route
// existing is not evidence; a content-type is.
//
// Deliberately offline: rewrite ORDER is a static fact about vercel.json, and
// the byte/header contract is a fact about the router. A network probe here
// would go red on a bad wifi day, which is worse than no test.
import { describe, it, expect } from 'vitest'
const fs = require('fs')
const os = require('os')
const path = require('path')
const http = require('http')
const express = require('express')
const buildsRouter = require('./builds-router.cjs')

const vercel = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'vercel.json'), 'utf8'))

/** Vercel evaluates rewrites in array order, first match wins. */
const firstMatching = (rewrites, urlPath) =>
  rewrites.find((r) => new RegExp('^' + r.source
    .replace(/:path\*/g, '.*')
    .replace(/\/$/, '') + '/?$').test(urlPath))

// SUPERSEDED (2026-09-06, job #696). The three assertions that used to live here
// demanded a /builds rewrite in vercel.json pointing at the tailscale funnel. That
// rewrite was reverted the same evening it landed (7becc11ba) because it shadowed
// the real SPA route /builds, and these assertions have been RED on main ever
// since — a test asserting a design nobody ships is noise, not a gate.
//
// What ships instead: the APK bytes live in the PUBLIC Supabase Storage bucket
// `app-builds`, which already answers a stranger with
// `Content-Type: application/vnd.android.package-archive` and no auth; popty.app
// serves only the PAGE, at /builds/android, as an ordinary SPA route marked
// `public: true`. No rewrite, no funnel, no serverless function streaming 23 MB
// (Vercel cannot), and nothing that dies when watson-1 reboots. The contract that
// matters is now asserted in src/router/publicAndroidBuild.test.js.
//
// The router below stays: it is still mounted on the internal production API at
// /api/builds, and its byte/header contract is still worth holding.

describe('builds router — bytes, not markup', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'builds-test-'))
  fs.writeFileSync(path.join(dir, 'ssi-test-debug.apk'), Buffer.from('PK\x03\x04fake-apk-bytes'))
  const token = fs.readFileSync(
    (buildsRouter.BUILDS_TOKEN_FOR_OPS(dir), path.join(dir, 'access-token.txt')), 'utf8').trim()

  const app = express()
  app.use('/api/builds', buildsRouter({ dir, logger: { info() {}, error() {} } }))
  const server = http.createServer(app)

  const get = async (p) => {
    await new Promise((r) => server.listening ? r() : server.listen(0, r))
    const res = await fetch(`http://127.0.0.1:${server.address().port}${p}`)
    return { res, body: Buffer.from(await res.arrayBuffer()) }
  }

  it('serves the APK as an installable package with an exact byte count', async () => {
    const { res, body } = await get(`/api/builds/${token}/ssi-test-debug.apk`)
    expect(res.status).toBe(200)
    expect(res.headers.get('content-type')).toBe('application/vnd.android.package-archive')
    expect(res.headers.get('content-type')).not.toMatch(/text\/html/)
    const size = fs.statSync(path.join(dir, 'ssi-test-debug.apk')).size
    expect(res.headers.get('content-length')).toBe(String(size))
    expect(body.length).toBe(size)
  })

  it('publishes the sha256 so a downloader can prove the bytes', async () => {
    const { res } = await get(`/api/builds/${token}/ssi-test-debug.apk`)
    const expected = require('crypto').createHash('sha256')
      .update(fs.readFileSync(path.join(dir, 'ssi-test-debug.apk'))).digest('hex')
    expect(res.headers.get('x-apk-sha256')).toBe(expected)
  })

  it('is a capability URL: no token, no listing and no download', async () => {
    expect((await get('/api/builds/wrong-token')).res.status).toBe(404)
    expect((await get('/api/builds/wrong-token/ssi-test-debug.apk')).res.status).toBe(404)
  })

  it('lists the build with its hash for the tester to check', async () => {
    const { res, body } = await get(`/api/builds/${token}`)
    expect(res.status).toBe(200)
    expect(body.toString()).toContain('ssi-test-debug.apk')
    expect(body.toString()).toMatch(/sha256 [0-9a-f]{64}/)
  })

  it('refuses anything that is not an apk in that directory', async () => {
    expect((await get(`/api/builds/${token}/access-token.txt`)).res.status).toBe(404)
    expect((await get(`/api/builds/${token}/..%2F..%2Fetc%2Fpasswd`)).res.status).toBe(404)
  })
})
