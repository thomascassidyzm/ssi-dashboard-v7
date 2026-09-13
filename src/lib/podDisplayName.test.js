import { describe, it, expect } from 'vitest'
import { podDisplayTitle, podDisplayLabel } from './podDisplayName.js'

// THE RULE IS A DISPLAY RULE. Every case here is about what a person reads;
// nothing in this file may ever assert anything about a slug changing.
//
// Tom, 2026-09-13: "There is only pod-1 now." Every core pod is keyed and
// titled pod-1, so the title is shown as written — the translation this
// module once carried for a retired numbering is gone, and these tests pin
// that it stays gone.
describe('podDisplayTitle', () => {
  it('reads the pod-1 row exactly as its title says', () => {
    expect(podDisplayTitle({
      slug: 'pod-1',
      title: 'Northern Welsh (colloquial Gogledd Cymru Welsh) Listening Pods — Pod 1',
    })).toBe('Northern Welsh (colloquial Gogledd Cymru Welsh) Listening Pods — Pod 1')
  })

  it('leaves every title exactly as written, whatever the slug', () => {
    expect(podDisplayTitle({ slug: 'pod-1', title: 'POD-1 conversations' })).toBe('POD-1 conversations')
    expect(podDisplayTitle({ slug: 'retired-2026-08-22', title: 'Croatian Listening Pods — Pod 1' }))
      .toBe('Croatian Listening Pods — Pod 1')
    expect(podDisplayTitle({ slug: 'pod-1', title: 'Everyday conversations' })).toBe('Everyday conversations')
    expect(podDisplayTitle({ slug: 'senedd-s4c-steve', title: 'Senedd S4C committee' })).toBe('Senedd S4C committee')
    expect(podDisplayTitle({ id: 'cym_n_for_eng:pod-1', title: 'Welsh pods — Pod 1' })).toBe('Welsh pods — Pod 1')
  })

  it('never throws on a half-built row', () => {
    expect(podDisplayTitle(null)).toBe('')
    expect(podDisplayTitle({})).toBe('')
    expect(podDisplayTitle({ slug: 'pod-1' })).toBe('')
  })
})

// AND THE MANAGE CARD USES IT TOO. The card cannot assume a title exists, so
// a pod with no title at all still gets a label built off the slug — the same
// label the pod cards and the detail header would show, so one body of work
// never carries two names on one screen (Tom, 2026-09-10).
describe('the label a pod falls back to when it has no title', () => {
  it('uses the title when there is one, and the slug when there is not', () => {
    expect(podDisplayLabel({ slug: 'pod-1', title: '' })).toBe('Pod 1')
    expect(podDisplayLabel({ id: 'cym_n_for_eng:pod-1' })).toBe('Pod 1')
    expect(podDisplayLabel({ slug: 'pod-1', title: 'Welsh Listening Pods — Pod 1' })).toBe('Welsh Listening Pods — Pod 1')
    expect(podDisplayLabel({ slug: 'method-pod', title: '' })).toBe('Pod method-pod')
    // A parked pod keeps its own name, here as everywhere else.
    expect(podDisplayLabel({ slug: 'retired-2026-08-22', title: 'Old Pod 1' })).toBe('Old Pod 1')
    expect(podDisplayLabel(null)).toBe('')
  })
})
