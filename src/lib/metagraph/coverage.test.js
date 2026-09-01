import { describe, it, expect } from 'vitest'
import { isPairOverlay } from './coverage.js'

describe('isPairOverlay', () => {
  it('detects a pair overlay: target text carried, no declared walk, own reference space', () => {
    const walk = {
      refSpace: 'health-general-welsh',
      steps: [{ payload: { targetLang: 'cym_n', target: 'iach' } }, { payload: {} }]
    }
    expect(isPairOverlay(walk)).toBe(true)
  })

  it('does not flag pod-1 — no target, no declarations, but nothing to overlay', () => {
    const walk = {
      refSpace: 'g',
      steps: [{ payload: { text: 'hello' } }]
    }
    expect(isPairOverlay(walk)).toBe(false)
  })

  it('does not flag a stored-walk pod that also carries a target — it declares its own walk', () => {
    const walk = {
      refSpace: 'method-pod-chapters',
      declarations: [{ sceneNumber: 1, nodeId: 'N2' }],
      steps: [{ payload: { targetLang: 'ita_n', target: 'ciao' } }]
    }
    expect(isPairOverlay(walk)).toBe(false)
  })

  it('does not flag a plain canonical walk with no target', () => {
    const walk = {
      refSpace: 'some-other-slug',
      steps: [{ payload: { text: 'no target here' } }]
    }
    expect(isPairOverlay(walk)).toBe(false)
  })

  it('reads the future Italian overlay the same way as Welsh, by shape not slug', () => {
    const walk = {
      refSpace: 'method-pod-italian',
      steps: [{ payload: { targetLang: 'ita_n', target: 'ciao' } }]
    }
    expect(isPairOverlay(walk)).toBe(true)
  })
})
