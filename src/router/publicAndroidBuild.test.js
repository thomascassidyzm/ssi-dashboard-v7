// The contract behind the ONE link Tom hands a field tester (job #696, 2026-09-06).
//
// Deborah has an SSi LEARNER account and no Popty login. The previous distribution
// surface was the authed /builds page, so what reached her phone was the login
// shell — HTTP 200, 669 bytes of HTML named `.apk`, which Android refuses in
// silence. Tom's ruling settled the gate: "they still have accounts so it doesn't
// matter if this build is publicly available" — the APK is not the secret, the
// account is.
//
// Three things must stay true or the link breaks again, and each is checked here
// as a static fact rather than a network probe (a probe would go red on a bad wifi
// day, which is worse than no test):
//   1. /builds/android is exempt from the auth guard.
//   2. /builds is still guarded, and the public path sits UNDER it, never over it —
//      the previous attempt shadowed it and 404'd the page Kai and Tom use.
//   3. the published build points at the PUBLIC storage bucket and carries the
//      provenance a person holding the link needs to tell what they installed.
import { describe, it, expect } from 'vitest'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const here = path.dirname(fileURLToPath(import.meta.url))
const routerSrc = fs.readFileSync(path.join(here, 'index.js'), 'utf8')
const manifest = JSON.parse(
  fs.readFileSync(path.join(here, '..', 'content', 'app-builds.json'), 'utf8')
)

/** The literal route block for a path, as written in the router source. */
const routeBlock = (routePath) => {
  const i = routerSrc.indexOf(`path: '${routePath}'`)
  if (i === -1) return null
  return routerSrc.slice(i, routerSrc.indexOf('},', i))
}

describe('the public Android download page', () => {
  it('declares /builds/android as a public route', () => {
    const block = routeBlock('/builds/android')
    expect(block, '/builds/android route missing — the public link 404s').toBeTruthy()
    expect(block).toMatch(/public:\s*true/)
    expect(block).not.toMatch(/requiresAuth/)
  })

  it('leaves the authed /builds list page guarded and unshadowed', () => {
    const block = routeBlock('/builds')
    expect(block).toBeTruthy()
    expect(block).toMatch(/requiresAuth:\s*true/)
    // Vue Router matches static segments before it falls back, and the public
    // path is strictly longer, so /builds itself cannot be captured by it.
    expect(routerSrc.indexOf("path: '/builds'"))
      .toBeLessThan(routerSrc.indexOf("path: '/builds/android'"))
  })

  it('serves exactly one build publicly, never a list', () => {
    const pub = (manifest.builds || []).filter((b) => b.public === true)
    expect(pub.length, 'more than one public build is a way to install the wrong one').toBe(1)
  })

  it('points that build at the public storage bucket, not at popty or the funnel', () => {
    const [b] = manifest.builds.filter((x) => x.public === true)
    expect(b.url).toMatch(/^https:\/\/[a-z0-9]+\.supabase\.co\/storage\/v1\/object\/public\/app-builds\//)
    expect(b.url).not.toMatch(/popty\.app|ts\.net|localhost/)
    expect(b.url.endsWith('.apk')).toBe(true)
  })

  it('carries the provenance a person holding the link can check', () => {
    const [b] = manifest.builds.filter((x) => x.public === true)
    for (const field of ['sha256', 'bytes', 'filename', 'commit', 'builtAt', 'applicationId']) {
      expect(b[field], `public build is missing ${field}`).toBeTruthy()
    }
    expect(b.sha256).toMatch(/^[0-9a-f]{64}$/)
    expect(b.bytes).toBeGreaterThan(1_000_000)
  })
})
