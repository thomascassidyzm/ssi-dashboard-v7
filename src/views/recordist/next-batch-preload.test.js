import { describe, it, expect } from 'vitest'
import { freshTicks, backgroundAnswerApplies, claimPreload, preloadUsable, wordsKey } from './next-batch-preload.js'

// cs #306: the rules the booth's next-batch preload lives by, as facts. Edits always win; a tick
// needs the same line AND the same words; one preload request per batch.

describe('edits always win over a background read that set out before them', () => {
  it('drops an answer stamped with a generation an edit has since advanced', () => {
    let gen = 4
    const startedAt = gen        // the reconcile sets out
    gen += 1                     // she saves an edit while it is out
    expect(backgroundAnswerApplies(startedAt, gen)).toBe(false)
  })

  it('applies an answer whose generation is still current', () => {
    expect(backgroundAnswerApplies(7, 7)).toBe(true)
  })

  it('never applies an answer with no generation at all', () => {
    expect(backgroundAnswerApplies(undefined, 0)).toBe(false)
  })
})

describe('a tick needs the same id and the same words', () => {
  const line = (id, text, recorded = false) => ({ id, text, recorded })

  it('ticks a line the fresh answer says is recorded when id and text match', () => {
    const shown = [line('a', 'Dw i eisiau mynd'), line('b', 'Wyt ti eisiau mynd?')]
    const fresh = [line('a', 'Dw i eisiau mynd', true), line('b', 'Wyt ti eisiau mynd?')]
    expect(freshTicks(shown, fresh)).toEqual([{ index: 0, clipUrl: null }])
  })

  it('gives no tick to an edited line: same id, the old words, recorded before the edit', () => {
    const shown = [line('a', 'Dw i eisiau mynd adre')]          // after her edit
    const fresh = [line('a', 'Dw i eisiau mynd', true)]          // read before it landed
    expect(freshTicks(shown, fresh)).toEqual([])
  })

  it('touches nothing when the lines are not the same lines in the same order', () => {
    expect(freshTicks([line('a', 'x'), line('b', 'y')], [line('b', 'y', true), line('a', 'x')])).toBe(null)
  })

  it('never removes a tick the screen already shows', () => {
    expect(freshTicks([line('a', 'x', true)], [line('a', 'x', false)])).toEqual([])
  })
})

describe('one preload request per batch', () => {
  it('marks the batch before the request and refuses a second, even after a failure', () => {
    const asked = new Set()
    expect(claimPreload(asked, 'v|seed.1|3')).toBe(true)
    // the request 204s or fails: nothing un-marks it
    expect(claimPreload(asked, 'v|seed.1|3')).toBe(false)
    expect(claimPreload(asked, 'v|seed.1|4')).toBe(true)
  })

  it('never claims an empty key', () => {
    expect(claimPreload(new Set(), '')).toBe(false)
  })
})

describe('a preload is shown only for its own batch and never past a take with its words', () => {
  const entry = { key: 'v|t|2', at: 1000, data: { lines: [{ id: 'a', text: 'Bore da!' }] } }

  it('is usable for its own key while young', () => {
    expect(preloadUsable(entry, { key: 'v|t|2', now: 2000 })).toBe(true)
  })

  it('is not usable for another key', () => {
    expect(preloadUsable(entry, { key: 'v|t|3', now: 2000 })).toBe(false)
  })

  it('is not usable once a take since shares a line\'s words', () => {
    expect(preloadUsable(entry, { key: 'v|t|2', now: 2000, takenWords: new Set([wordsKey('bore da')]) })).toBe(false)
  })
})
