// Job #113: the backfill must not become the #382 loop (paid renders that nothing links). The render/attach breaker stops a run once
// IDLE_RENDER_STOP paid renders in a row have moved no slot, instead of paying for every clip in the queue.
import { describe, it, expect } from 'vitest'
import { createRequire } from 'node:module'
const req = createRequire(import.meta.url)
const { runBudgeted, IDLE_RENDER_STOP = 3 } = req('./charlotte-backfill.cjs')

const clip = id => ({ oldId: id, role: 'known', chars: 10, text: 'x'.repeat(10), oldVoice: 'eve', slots: [{}] })
const paid = w => ({ ok: true, status: 200, audioId: `new-${w.oldId}`, charsSpent: w.chars, source: 'rendered' })
const free = w => ({ ok: true, status: 200, audioId: `lib-${w.oldId}`, charsSpent: 0, source: 'library' })
const queue = n => Array.from({ length: n }, (_, i) => clip(`c${i}`))

describe('render/attach breaker (job #113)', () => {
  it('stops after IDLE_RENDER_STOP paid renders that moved no slot', async () => {
    const rendered = []
    const r = await runBudgeted(queue(20), { budget: 1e6, render: async w => { rendered.push(w.oldId); return paid(w) }, verify: async () => null, commit: async () => 0 })
    expect(rendered.length).toBe(IDLE_RENDER_STOP) // pre-fix: all 20 rendered and paid for
    expect(r.spent).toBe(IDLE_RENDER_STOP * 10)
    expect(r.breaker).toMatch(/moved no slot/)
  })
  it('a paid render whose verify fails counts as idle too', async () => {
    const rendered = []
    const r = await runBudgeted(queue(10), { budget: 1e6, render: async w => { rendered.push(w.oldId); return paid(w) }, verify: async () => 'voice is x', commit: async () => 1 })
    expect(rendered.length).toBe(IDLE_RENDER_STOP)
    expect(r.breaker).toBeTruthy()
  })
  it('library hits that move nothing cost nothing and never trip it', async () => {
    const r = await runBudgeted(queue(10), { budget: 1e6, render: async w => free(w), verify: async () => null, commit: async () => 0 })
    expect(r.done).toBe(10)
    expect(r.breaker).toBeFalsy()
  })
  it('a render that moves slots resets the count', async () => {
    let i = 0
    const r = await runBudgeted(queue(12), { budget: 1e6, render: async w => paid(w), verify: async () => null, commit: async () => (++i % 2 ? 0 : 3) })
    expect(r.done).toBe(12)
    expect(r.breaker).toBeFalsy()
  })
})
