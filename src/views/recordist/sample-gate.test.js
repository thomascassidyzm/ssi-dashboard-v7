import { describe, it, expect, vi } from 'vitest'
import { sampleGateAction, gateAppliesTo, readSampleGate, approveSampleGate, approveSampleGateOnUnload, releaseWhenSettled, passedInThisTab } from './sample-gate.js'
import { installVersionReload, holdReload, resetVersionReload } from '../../router/versionReload.js'

const memStore = () => { const m = new Map(); return { getItem: k => m.get(k) ?? null, setItem: (k, v) => m.set(k, String(v)) } }

describe('sample-gate.js (booth)', () => {
  it('stops a gated live session at the sample size, not before', () => {
    expect(sampleGateAction({ gated: true, held: false, phase: 'recording', saved: 4 })).toBe(null)
    expect(sampleGateAction({ gated: true, held: false, phase: 'recording', saved: 5 })).toBe('stop')
  })
  it('shows a short session at its end; never acts ungated or once held', () => {
    expect(sampleGateAction({ gated: true, held: false, phase: 'done', saved: 4 })).toBe('show')
    expect(sampleGateAction({ gated: false, held: false, phase: 'recording', saved: 50 })).toBe(null)
    expect(sampleGateAction({ gated: true, held: true, phase: 'recording', saved: 50 })).toBe(null)
    expect(sampleGateAction({ gated: true, held: false, phase: 'done', saved: 0 })).toBe(null)
  })
  it('packs are never gated, and a failed read opens the gate', async () => {
    expect(gateAppliesTo('pack-setup-human_x')).toBe(false)
    const r = await readSampleGate({ base: '', voiceId: 'human_x', build: 'abc', fetchImpl: vi.fn().mockRejectedValue(new Error('down')) })
    expect(r.gated).toBe(false)
  })
  it('a pass is remembered in the tab even when the store cannot save it, so a reload does not ask again (job #569)', async () => {
    const session = memStore()
    const fetchImpl = vi.fn().mockRejectedValue(new Error('down'))
    const ok = await approveSampleGate({ base: '', voiceId: 'human_x', build: 'abc', fetchImpl, attempts: 2, waitMs: 0, session })
    expect(ok).toBe(false)
    expect(fetchImpl).toHaveBeenCalledTimes(2)
    expect(passedInThisTab('human_x', 'abc', session)).toBe(true)
    const read = vi.fn()
    expect((await readSampleGate({ base: '', voiceId: 'human_x', build: 'abc', fetchImpl: read, session })).gated).toBe(false)
    expect(read).not.toHaveBeenCalled()
  })
  it('approval retries a blip but not a refusal', async () => {
    const blip = vi.fn().mockResolvedValueOnce({ ok: false, status: 503 }).mockResolvedValueOnce({ ok: true })
    expect(await approveSampleGate({ base: '', voiceId: 'human_x', build: 'abc', fetchImpl: blip, waitMs: 0, session: memStore() })).toBe(true)
    const refused = vi.fn().mockResolvedValue({ ok: false, status: 403 })
    expect(await approveSampleGate({ base: '', voiceId: 'human_x', build: 'abc', fetchImpl: refused, waitMs: 0, session: memStore() })).toBe(false)
    expect(refused).toHaveBeenCalledTimes(1)
  })

  it('a reload or a closed tab sends the approval with keepalive, and remembers it in the tab first (job #574)', () => {
    const session = memStore()
    const fetchImpl = vi.fn().mockResolvedValue({ ok: true })
    const beacon = vi.fn()
    expect(approveSampleGateOnUnload({ base: '/b', voiceId: 'human_x', build: 'abc', withKey: (u) => `${u}?k=1`, fetchImpl, beacon, session })).toBe(true)
    const [url, init] = fetchImpl.mock.calls[0]
    expect(url).toBe('/b/api/recording/voice/human_x/sample-gate/approve?k=1')
    expect(init).toMatchObject({ method: 'POST', keepalive: true, headers: { 'Content-Type': 'application/json' } })
    expect(JSON.parse(init.body)).toEqual({ build: 'abc', by: 'artist' })
    expect(beacon).not.toHaveBeenCalled()
    expect(passedInThisTab('human_x', 'abc', session)).toBe(true)
  })
  it('falls back to sendBeacon when keepalive fetch is not there', () => {
    const beacon = vi.fn().mockReturnValue(true)
    expect(approveSampleGateOnUnload({ base: '', voiceId: 'human_x', build: 'abc', fetchImpl: null, beacon, session: memStore() })).toBe(true)
    expect(beacon).toHaveBeenCalledTimes(1)
    expect(beacon.mock.calls[0][1].type).toBe('application/json')
  })
  it('a waiting new-build reload goes only after the approval save settles, not when the check is let go (job #574)', async () => {
    resetVersionReload()
    const reload = vi.fn()
    let onVisible
    const doc = { visibilityState: 'visible', addEventListener: (_e, fn) => { onVisible = fn }, removeEventListener: () => {} }
    const off = installVersionReload({ current: 'old', fetchLatest: async () => 'new', reload, doc, setIntervalImpl: () => 0, clearIntervalImpl: () => {} })
    holdReload('booth-sample', true) // the check is on screen
    onVisible()
    await new Promise((r) => setTimeout(r, 0))
    expect(reload).not.toHaveBeenCalled() // new build seen, waiting on the hold
    let finish
    const save = new Promise((r) => { finish = r })
    releaseWhenSettled(save, () => holdReload('booth-sample', false), 60000, () => 0) // the artist carries on
    await Promise.resolve()
    expect(reload).not.toHaveBeenCalled() // still saving: the reload waits
    finish(true)
    await save
    await Promise.resolve()
    expect(reload).toHaveBeenCalledTimes(1)
    off()
    resetVersionReload()
  })
  it('releaseWhenSettled lets go once on settle, or at the cap if the save hangs', async () => {
    const release = vi.fn()
    let cap
    releaseWhenSettled(new Promise(() => {}), release, 15000, (fn) => { cap = fn })
    expect(release).not.toHaveBeenCalled()
    cap()
    expect(release).toHaveBeenCalledTimes(1)
    const release2 = vi.fn()
    const p = Promise.reject(new Error('down'))
    releaseWhenSettled(p, release2, 15000, () => 0)
    await p.catch(() => {})
    await Promise.resolve()
    expect(release2).toHaveBeenCalledTimes(1)
  })
})
