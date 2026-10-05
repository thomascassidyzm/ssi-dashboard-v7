import { describe, it, expect } from 'vitest'
import { createRequire } from 'node:module'
const req = createRequire(import.meta.url)
const { runBudgeted } = req('./charlotte-backfill.cjs')
const { parsePass } = req('./ita-revoice-759.cjs')

const clip = (id, chars) => ({ oldId: id, role: 'known', chars, text: 'x'.repeat(chars), oldVoice: 'eve', slots: [] })
const ok = w => ({ ok: true, status: 200, audioId: `new-${w.oldId}`, charsSpent: w.chars, source: 'rendered' })

describe('runBudgeted (job #834)', () => {
  it('no refund after charge: a throw in verify keeps the real charge, budget stops the next clip', async () => {
    const work = [clip('a', 100), clip('b', 100)]
    const r = await runBudgeted(work, { budget: 100, concurrency: 1, render: async w => ok(w), verify: async () => { throw new Error('proxy down') }, commit: async () => {} })
    expect(r.spent).toBe(100) // pre-fix: refunded on throw, so clip b rendered too and spend was 200
    expect(r.budgetSkipped).toBe(1)
  })
  it('a throw before settlement (render itself throws) is still refunded', async () => {
    const r = await runBudgeted([clip('a', 100)], { budget: 100, render: async () => { throw new Error('network') }, verify: async () => null, commit: async () => {} })
    expect(r.spent).toBe(0)
  })
  it('budget-skipped clips are reported separately', async () => {
    const r = await runBudgeted([clip('a', 400)], { budget: 300, render: async w => ok(w), verify: async () => null, commit: async () => {} })
    expect(r).toMatchObject({ spent: 0, done: 0, budgetSkipped: 1 })
  })
})

describe('driver parsePass (job #834)', () => {
  it('splits unaffordable from failed work', () => {
    expect(parsePass('OUTSTANDING 1\nSKIPPED-BUDGET 1\n')).toEqual({ outstanding: 1, skippedBudget: 1 })
    expect(parsePass('OUTSTANDING 3\nSKIPPED-BUDGET 1\n')).toEqual({ outstanding: 3, skippedBudget: 1 }) // 2 genuine failures remain
    expect(parsePass('OUTSTANDING 2\n').skippedBudget).toBe(0) // old tool output
    expect(parsePass('nothing')).toBeNull()
  })
})
