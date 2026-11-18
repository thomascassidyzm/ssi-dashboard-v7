// @vitest-environment jsdom
// A booth tab that is never hidden still picks up a new build (job #829), but never mid-take.
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { installVersionReload, holdReload, allowIdleReload, resetVersionReload, VERSION_POLL_MS } from './versionReload.js'

let uninstall = () => {}
beforeEach(() => { resetVersionReload(); vi.useFakeTimers() })
afterEach(() => { uninstall(); vi.useRealTimers() })

describe('a new build reaches a tab that is never hidden (job #829)', () => {
  it('looks again every few minutes while the booth stays in view, and reloads on a new build', async () => {
    const reload = vi.fn()
    allowIdleReload('booth', true)
    let latest = 'aaa'
    uninstall = installVersionReload({ current: 'aaa', fetchLatest: async () => latest, reload })
    await vi.advanceTimersByTimeAsync(VERSION_POLL_MS)
    expect(reload).not.toHaveBeenCalled()
    latest = 'bbb'
    await vi.advanceTimersByTimeAsync(VERSION_POLL_MS)
    expect(reload).toHaveBeenCalledTimes(1)
  })

  it('looks on every page move', async () => {
    const reload = vi.fn()
    let hook = null
    const router = { afterEach: (fn) => { hook = fn; return () => {} } }
    uninstall = installVersionReload({ current: 'aaa', fetchLatest: async () => 'bbb', reload, router })
    hook()
    await vi.advanceTimersByTimeAsync(0)
    expect(reload).toHaveBeenCalledTimes(1)
  })

  it('the timed look never reloads a page that has not allowed it — it waits for the next page move', async () => {
    const reload = vi.fn()
    let hook = null
    const router = { afterEach: (fn) => { hook = fn; return () => {} } }
    uninstall = installVersionReload({ current: 'aaa', fetchLatest: async () => 'bbb', reload, router })
    await vi.advanceTimersByTimeAsync(VERSION_POLL_MS * 2)
    expect(reload).not.toHaveBeenCalled()
    hook()
    await vi.advanceTimersByTimeAsync(0)
    expect(reload).toHaveBeenCalledTimes(1)
  })

  it('never reloads while the booth holds it (the mic is live), and reloads the moment it lets go', async () => {
    const reload = vi.fn()
    uninstall = installVersionReload({ current: 'aaa', fetchLatest: async () => 'bbb', reload })
    allowIdleReload('booth', true)
    holdReload('booth', true)
    await vi.advanceTimersByTimeAsync(VERSION_POLL_MS * 3)
    expect(reload).not.toHaveBeenCalled()
    holdReload('booth', false)
    expect(reload).toHaveBeenCalledTimes(1)
  })

  it('a build it cannot read changes nothing', async () => {
    const reload = vi.fn()
    uninstall = installVersionReload({ current: 'aaa', fetchLatest: async () => { throw new Error('offline') }, reload })
    await vi.advanceTimersByTimeAsync(VERSION_POLL_MS)
    expect(reload).not.toHaveBeenCalled()
  })
})

describe('a held reload is said out loud (job #43, Auke 2026-11-02)', () => {
  it('reloadWaiting is true while a new build waits on a hold, and the reload lands when it is let go', async () => {
    const { reloadWaiting } = await import('./versionReload.js')
    const reload = vi.fn()
    let hook = null
    const router = { afterEach: (fn) => { hook = fn; return () => {} } }
    holdReload('autocue-session', true)
    uninstall = installVersionReload({ current: 'aaa', fetchLatest: async () => 'bbb', reload, router })
    hook()
    await vi.advanceTimersByTimeAsync(0)
    expect(reload).not.toHaveBeenCalled()
    expect(reloadWaiting.value).toBe(true)
    holdReload('autocue-session', false)
    expect(reload).toHaveBeenCalledTimes(1)
    expect(reloadWaiting.value).toBe(false)
  })
})
