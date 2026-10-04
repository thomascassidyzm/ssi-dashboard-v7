import { describe, it, expect } from 'vitest'
import { createRequire } from 'node:module'
const { swapKey, undoneSet } = createRequire(import.meta.url)('./charlotte-backfill.cjs')

// job #596: --undo --limit N used to repeat the same batch, since nothing marked a swap undone
describe('charlotte-backfill undo ledger', () => {
  const swap = (o, n) => ({ kind: 'swap', oldId: o, newId: n, slots: [] })
  it('a swap with a kind:undo line is done and skipped', () => {
    const ledger = [swap('a', 'A'), swap('b', 'B'), swap('c', 'C'), { kind: 'undo', oldId: 'c', newId: 'C' }]
    const done = undoneSet(ledger)
    const todo = ledger.filter(e => e.kind === 'swap' && !done.has(swapKey(e)))
    expect(todo.map(e => e.oldId)).toEqual(['a', 'b'])
  })
})

// review of fa114eee5: a swap re-made AFTER an undo (same oldId|newId, library-first render returns the same clip) must be undoable again
describe('charlotte-backfill undo ledger, re-swap after undo', () => {
  it('a swap line written after its undo line is still pending', () => {
    const ledger = [
      { kind: 'swap', oldId: 'a', newId: 'A', slots: [] },
      { kind: 'undo', oldId: 'a', newId: 'A' },
      { kind: 'swap', oldId: 'a', newId: 'A', slots: [] },
    ]
    const done = undoneSet(ledger)
    const todo = ledger.filter(e => e.kind === 'swap' && !done.has(swapKey(e)))
    expect(todo).toHaveLength(1)
  })
})
