// THE GUARD FOR THE 2026-09-04 18:24Z BREAKAGE.
//
// A Vercel deploy at 18:22 renamed every route chunk under the tab Tom already
// had open. Because the SPA rewrite answered the missing `/assets/*.js` with
// 200 index.html, every lazy nav link stopped doing anything, with no error the
// person could see. Nothing about the nav declaration was wrong — 53 guard
// tests passed against the deployed code the whole time.
//
// Two things stop it recurring, and both are asserted here: the rewrite must
// not swallow /assets, and a navigation that fails for want of its code must
// reload the tab at the destination.
import { describe, it, expect, vi } from 'vitest'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { isChunkLoadError, installChunkReloadRecovery } from './chunkRecovery.js'

const read = (rel) => readFileSync(fileURLToPath(new URL(rel, import.meta.url)), 'utf8')

describe('the SPA rewrite tells the truth about a missing chunk', () => {
  const vercel = JSON.parse(read('../../vercel.json'))
  const spa = vercel.rewrites.find((r) => r.destination === '/index.html')

  it('exists and excludes assets/, so a stale chunk 404s instead of returning HTML', () => {
    expect(spa, 'the SPA fallback rewrite is gone').toBeTruthy()
    const pattern = new RegExp('^' + spa.source.replace(/^\//, '\\/') + '$')
    expect(pattern.test('/assets/index-abc123.js'), 'a missing chunk would be rewritten to index.html').toBe(false)
    // …while real routes still fall through to the SPA.
    expect(pattern.test('/admin')).toBe(true)
    expect(pattern.test('/canonical/seeds')).toBe(true)
  })
})

describe('recognising a chunk that would not load', () => {
  it.each([
    'Failed to fetch dynamically imported module: https://popty.app/assets/Admin-7Osy.js',
    'error loading dynamically imported module',
    "Failed to load module script: Expected a JavaScript module script but the server responded with a MIME type of \"text/html\".",
    "Unexpected token '<'"
  ])('flags %s', (message) => {
    expect(isChunkLoadError(new Error(message))).toBe(true)
  })

  it.each(['Navigation aborted', 'Cannot read properties of undefined'])('does not flag %s', (message) => {
    expect(isChunkLoadError(new Error(message))).toBe(false)
  })
})

function fakeRouter() {
  const handlers = { onError: [], afterEach: [] }
  return {
    onError: (fn) => handlers.onError.push(fn),
    afterEach: (fn) => handlers.afterEach.push(fn),
    fail: (error, to) => handlers.onError.forEach((fn) => fn(error, to)),
    arrive: () => handlers.afterEach.forEach((fn) => fn())
  }
}

function fakeWindow() {
  const store = new Map()
  return {
    location: { pathname: '/admin', assign: vi.fn() },
    sessionStorage: {
      getItem: (k) => (store.has(k) ? store.get(k) : null),
      setItem: (k, v) => store.set(k, v),
      removeItem: (k) => store.delete(k)
    }
  }
}

describe('a stale tab reloads at the page you clicked', () => {
  it('reloads at the destination when the chunk will not load', () => {
    const router = fakeRouter()
    const win = fakeWindow()
    installChunkReloadRecovery(router, win, win.sessionStorage)
    router.fail(new Error('Failed to fetch dynamically imported module'), { fullPath: '/users' })
    expect(win.location.assign).toHaveBeenCalledWith('/users')
  })

  it('leaves any other navigation error alone', () => {
    const router = fakeRouter()
    const win = fakeWindow()
    installChunkReloadRecovery(router, win, win.sessionStorage)
    router.fail(new Error('Navigation aborted'), { fullPath: '/users' })
    expect(win.location.assign).not.toHaveBeenCalled()
  })

  it('reloads once per destination, so a genuinely broken chunk cannot loop', () => {
    const router = fakeRouter()
    const win = fakeWindow()
    installChunkReloadRecovery(router, win, win.sessionStorage)
    const boom = new Error('Failed to fetch dynamically imported module')
    router.fail(boom, { fullPath: '/users' })
    router.fail(boom, { fullPath: '/users' })
    expect(win.location.assign).toHaveBeenCalledTimes(1)
  })

  it('rearms once a navigation succeeds', () => {
    const router = fakeRouter()
    const win = fakeWindow()
    installChunkReloadRecovery(router, win, win.sessionStorage)
    const boom = new Error('Failed to fetch dynamically imported module')
    router.fail(boom, { fullPath: '/users' })
    router.arrive()
    router.fail(boom, { fullPath: '/users' })
    expect(win.location.assign).toHaveBeenCalledTimes(2)
  })
})

describe('main.js actually installs it', () => {
  it('wires the recovery into the app router', () => {
    const main = read('../main.js')
    expect(main).toContain("from './router/chunkRecovery'")
    expect(main).toContain('installChunkReloadRecovery(router)')
  })
})
