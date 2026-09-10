import { describe, it, expect } from 'vitest'
import { podDisplayTitle, podDisplayLabel } from './podDisplayName.js'

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

// AND THE MANAGE CARD USES IT TOO.
//
// Tom, 2026-09-10: "It is the old links in the pods. They are the problem."
// The pod cards and the detail header were renamed on 2026-09-09; the manage
// card's own label was not, so on Welsh it read "Pod 0 — already generated"
// directly under a card that had just said Pod 1 — one body of work, two names,
// on one screen. This pins the shape that fixed it: a pod with no title at all
// still gets the renamed fallback, which is what the card falls back to.
describe('the label a pod falls back to when it has no title', () => {
  it('renames the fallback as well as the title', () => {
    const label = podDisplayLabel
    expect(label({ slug: 'pod-0', title: '' })).toBe('Pod 1')
    expect(label({ slug: 'pod-1', title: '' })).toBe('Pod 1')
    expect(label({ slug: 'pod-0', title: 'Welsh Listening Pods — Pod 0' })).toBe('Welsh Listening Pods — Pod 1')
    // A parked pod keeps its own name, here as everywhere else.
    expect(label({ slug: 'pod-0-retired-2026-08-22', title: 'Old Pod 0' })).toBe('Old Pod 0')
  })
})
