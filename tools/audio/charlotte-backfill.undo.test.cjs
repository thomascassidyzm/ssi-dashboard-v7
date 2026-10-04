import { describe, it, expect } from 'vitest'
import { createRequire } from 'node:module'
const { swapKey, undoneSet, pendingSwaps } = createRequire(import.meta.url)('./charlotte-backfill.cjs')

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
    const todo = pendingSwaps(ledger)
    expect(todo).toHaveLength(1)
    expect(todo[0]).toBe(ledger[2])
    expect(undoneSet(ledger).has(swapKey(ledger[0]))).toBe(false)
  })
})

// job #608 / #614: the Charlotte passes select FEMALE voices only; a male slot must never become Charlotte
describe('charlotte-backfill gender filter', () => {
  const m = createRequire(import.meta.url)('./charlotte-backfill.cjs')
  it('classifies by voice identity, prefix-agnostic; unknown is null', () => {
    for (const id of ['eve', 'xai_eve', 'xai_eve_q', 'ara_q', 'azure_en-GB-SoniaNeural', 'en-GB-LibbyNeural']) expect(m.voiceGender(id)).toBe('f')
    for (const id of ['leo', 'xai_leo', 'xai_sal', 'rex', 'gfzdpspr5fdp', 'xai_gfzdpspr5fdp', 'azure_en-GB-RyanNeural', 'en-GB-OliverNeural']) expect(m.voiceGender(id)).toBe('m')
    for (const id of ['azure_', 'xai_f15c6a6a', 'azure_en-GB-NewNeural', '', null]) expect(m.voiceGender(id)).toBeNull()
  })
  it('the general pass SQL lists no male or unknown voice; the male pass lists no female', () => {
    for (const id of ['leo', 'sal', 'rex', 'gfzdpspr5fdp', 'en-GB-RyanNeural']) expect(m.BAD_VOICE).not.toContain(`'${id}'`)
    for (const id of ['eve', 'ara', 'en-GB-SoniaNeural']) expect(m.MALE_VOICE).not.toContain(`'${id}'`)
    expect(m.BAD_VOICE).toContain("'en-GB-SoniaNeural'")
    expect(m.BAD_VOICE).toBe(m.FEMALE_VOICE)
  })
  it('xai-female regex covers eve/ara (incl. _q) and never leo/sal/rex/clones', () => {
    const re = new RegExp(m.FEMALE_XAI.match(/'(.*)'/)[1])
    for (const id of ['eve_q', 'ara_q', 'xai_eve_q', 'eve', 'ara']) expect(re.test(id)).toBe(true)
    for (const id of ['leo', 'xai_sal', 'rex', 'gfzdpspr5fdp']) expect(re.test(id)).toBe(false)
  })
  it('every pass renders to its own voice, and only for its own gender', () => {
    expect(m.PASSES.general).toMatchObject({ target: m.CHARLOTTE, gender: 'f' })
    expect(m.PASSES['xai-female']).toMatchObject({ target: m.CHARLOTTE, gender: 'f' })
    expect(m.PASSES.male).toMatchObject({ target: m.TOM_001, gender: 'm' })
    expect(m.PASSES['xai-male']).toMatchObject({ target: m.TOM_001, gender: 'm' })
  })
})
