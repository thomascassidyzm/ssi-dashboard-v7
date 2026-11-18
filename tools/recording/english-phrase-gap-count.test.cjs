// npx vitest run tools/recording/english-phrase-gap-count.test.cjs
import { describe, it, expect } from 'vitest'
import { createRequire } from 'module'
const require = createRequire(import.meta.url)
const { tallyPhraseGap, notInPlan } = require('./english-phrase-gap-count.cjs')

const N = 'cym_nv2_for_eng'
const S = 'cym_sv2_for_eng'
const line = (id, pass, courseCode, copyCourses, text, flagged = false) => ({
  id, pass, courseCode, text, wordsKey: text,
  copies: copyCourses.map((c) => ({ courseCode: c, flagged })),
})

describe('english-phrase-gap-count', () => {
  it('splits the lines with no take by pass, by North/South/shared and by booth card, with characters', () => {
    const lines = [
      line('a', 1, N, [N], 'I want'),            // North only, no take
      line('b', 1, N, [N, S], 'to go'),          // shared, on the North card, no take
      line('c', 1, S, [S], 'now'),               // South only, recorded
      line('d', 1, S, [S, S], 'later on'),       // South only (two South copies), no take
      line('e', 2, S, [S], 'held one', true),    // held by a proof flag
      line('f', 2, N, [N, S], 'both'),           // shared, pass 2, no take
    ]
    const t = tallyPhraseGap(lines, (l) => l.id === 'c')
    expect(t[1].all).toEqual({ lines: 4, chars: 6 + 5 + 3 + 8 })
    expect(t[1].recorded).toEqual({ lines: 1, chars: 3 })
    expect(t[1].noTake).toEqual({ lines: 3, chars: 6 + 5 + 8 })
    expect(t[1].noTakeBySpan).toEqual({ north: { lines: 1, chars: 6 }, south: { lines: 1, chars: 8 }, shared: { lines: 1, chars: 5 } })
    expect(t[1].noTakeByCard).toEqual({ [N]: { lines: 2, chars: 11 }, [S]: { lines: 1, chars: 8 } })
    expect(t[2].held).toEqual({ lines: 1, chars: 8 })
    expect(t[2].noTake.lines).toBe(1)
    expect(t[2].noTakeBySpan.shared.lines).toBe(1)
  })

  it('counts English the courses need that the booth does not ask for (slot holds another voice)', () => {
    const queued = [line('a', 1, N, [N], 'one')]
    const all = [line('a', 1, N, [N], 'one'), line('x', 2, S, [S], 'taken')]
    expect(notInPlan(all, queued)).toEqual({ 1: { lines: 0, chars: 0 }, 2: { lines: 1, chars: 5 } })
  })
})
