import { describe, it, expect } from 'vitest'
import { podBlockNav, addressWithPod } from './pod-blocks.js'

const B = (slug, total, recorded) => ({ podId: `c:${slug}`, slug, title: slug, total, recorded })

describe('podBlockNav — which block, and where next goes', () => {
  it('a finished pod leads to the next LATER pod with lines left', () => {
    const nav = podBlockNav([B('pod-1', 10, 10), B('pod-2', 5, 5), B('pod-3', 8, 0)], 'pod-1')
    expect(nav.number).toBe(1)
    expect(nav.count).toBe(3)
    expect(nav.currentDone).toBe(true)
    expect(nav.next.slug).toBe('pod-3')
    expect(nav.next.number).toBe(3)
    expect(nav.next.earlier).toBe(false)
  })

  it('nothing later with lines left -> an unfinished earlier pod, flagged earlier', () => {
    const nav = podBlockNav([B('pod-1', 10, 9), B('pod-2', 5, 5)], 'pod-2')
    expect(nav.next.slug).toBe('pod-1')
    expect(nav.next.earlier).toBe(true)
  })

  it('nothing left anywhere -> no next (the booth says "next block coming soon")', () => {
    expect(podBlockNav([B('pod-1', 10, 10)], 'pod-1').next).toBe(null)
    expect(podBlockNav([B('pod-1', 10, 10), B('pod-2', 3, 3)], 'pod-1').next).toBe(null)
  })

  it('live counts from this session win for the block being read', () => {
    const nav = podBlockNav([B('pod-1', 10, 8), B('pod-2', 5, 0)], 'pod-1', { total: 10, recorded: 10 })
    expect(nav.currentDone).toBe(true)
    expect(nav.blocks[0].done).toBe(true)
  })

  it('an unfinished pod is not done; the full pod id on the address works too', () => {
    const nav = podBlockNav([B('pod-1', 10, 3), B('pod-2', 5, 0)], 'c:pod-1')
    expect(nav.currentDone).toBe(false)
    expect(nav.next.slug).toBe('pod-2')
  })

  it('a pod that is not one of their blocks gives no nav at all', () => {
    expect(podBlockNav([B('pod-1', 1, 0)], 'health')).toBe(null)
    expect(podBlockNav(null, 'pod-1')).toBe(null)
    expect(podBlockNav([B('pod-1', 1, 0)], '')).toBe(null)
  })
})

describe('addressWithPod', () => {
  it('swaps ?pod= and keeps the rest of the link', () => {
    expect(addressWithPod('https://popty.app/r/human_eleri_cym_s?course=cym_s_for_eng&pod=pod-1', 'pod-2'))
      .toBe('/r/human_eleri_cym_s?course=cym_s_for_eng&pod=pod-2')
  })
})
