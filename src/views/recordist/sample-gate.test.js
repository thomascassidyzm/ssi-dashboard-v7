import { describe, it, expect, vi } from 'vitest'
import { sampleGateAction, gateAppliesTo, readSampleGate } from './sample-gate.js'

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
})
