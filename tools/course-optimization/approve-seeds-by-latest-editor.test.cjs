// Only seeds whose LATEST text save is the person's are approved; an agent re-save after them, or no save at all, is not.
import { describe, it, expect } from 'vitest'
const { plan } = require('./approve-seeds-by-latest-editor.cjs')
const ev = (t, op, actor, seeds) => ({ occurred_at: `2026-10-0${t}T00:00:00Z`, operation: op, actor_id: actor, actor_label: actor, seeds })
describe('plan', () => {
  it('approves latest-by-person only', () => {
    const events = [ev(1, 'translate', 'auke', [1, 2, 3]), ev(2, 'translate', 'agent', [2]), ev(3, 'approve', 'kai', [1])]
    const seeds = [1, 2, 3, 4].map((n) => ({ seed_number: n, approved_at: n === 3 ? 'x' : null }))
    const p = plan({ events, seeds, isPerson: (e) => e.actor_id === 'auke' })
    expect(p.approve).toEqual([1])
    expect(p.alreadyApproved).toEqual([3])
    expect(p.notTheirs.map((x) => x.seed)).toEqual([2])
    expect(p.neverSaved).toEqual([4])
  })
})
