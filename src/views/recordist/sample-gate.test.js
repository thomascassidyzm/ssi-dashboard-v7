import { describe, it, expect, vi } from 'vitest'
import { sampleGateAction, gateAppliesTo, readSampleGate, approveSampleGate, passedInThisTab } from './sample-gate.js'

const memStore = () => { const m = new Map(); return { getItem: k => m.get(k) ?? null, setItem: (k, v) => m.set(k, String(v)) } }

describe('sample-gate.js (booth)', () => {
  it('stops a gated live session at the sample size, not before', () => {
    expect(sampleGateAction({ gated: true, held: false, phase: 'recording', saved: 9 })).toBe(null)
    expect(sampleGateAction({ gated: true, held: false, phase: 'recording', saved: 10 })).toBe('stop')
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
  it('sends the card (track) so the server can spare Re-record for a voice that has passed (job #569)', async () => {
    const fetchImpl = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ needsSample: false, sampleSize: 10 }) })
    await readSampleGate({ base: '', voiceId: 'human_x', build: 'abc', track: 'rerecord', fetchImpl, session: memStore() })
    expect(fetchImpl.mock.calls[0][0]).toContain('track=rerecord')
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
})
