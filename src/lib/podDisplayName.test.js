import { describe, it, expect } from 'vitest'
import { podDisplayTitle } from './podDisplayName.js'

// THE RULE IS A DISPLAY RULE. Every case here is about what a person reads;
// nothing in this file may ever assert anything about a slug changing.
describe('podDisplayTitle', () => {
  it('reads the pod-0 row as Pod 1 — the name the booth and the product already use', () => {
    expect(podDisplayTitle({
      slug: 'pod-0',
      title: 'Northern Welsh (colloquial Gogledd Cymru Welsh) Listening Pods — Pod 0',
    })).toBe('Northern Welsh (colloquial Gogledd Cymru Welsh) Listening Pods — Pod 1')
  })

  it('keeps the title’s own separator and case', () => {
    expect(podDisplayTitle({ slug: 'pod-0', title: 'POD-0 conversations' })).toBe('POD-1 conversations')
    expect(podDisplayTitle({ slug: 'pod-0', title: 'Pod0' })).toBe('Pod1')
  })

  it('leaves a retired pod alone — it is not the pod that got renamed', () => {
    expect(podDisplayTitle({ slug: 'pod-0-retired-2026-08-22', title: 'Croatian Listening Pods — Pod 0' }))
      .toBe('Croatian Listening Pods — Pod 0')
  })

  it('leaves every other pod, and every other title, exactly as written', () => {
    expect(podDisplayTitle({ slug: 'pod-1', title: 'Croatian Listening Pods — Pod 1' }))
      .toBe('Croatian Listening Pods — Pod 1')
    expect(podDisplayTitle({ slug: 'pod-0', title: 'Everyday conversations' })).toBe('Everyday conversations')
    expect(podDisplayTitle({ slug: 'senedd-s4c-steve', title: 'Senedd S4C committee' })).toBe('Senedd S4C committee')
  })

  it('resolves the slug off the id when the row carries no slug column', () => {
    expect(podDisplayTitle({ id: 'cym_n_for_eng:pod-0', title: 'Welsh pods — Pod 0' })).toBe('Welsh pods — Pod 1')
  })

  it('never throws on a half-built row', () => {
    expect(podDisplayTitle(null)).toBe('')
    expect(podDisplayTitle({})).toBe('')
    expect(podDisplayTitle({ slug: 'pod-0' })).toBe('')
  })
})
