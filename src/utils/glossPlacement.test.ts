import { describe, it, expect } from 'vitest'
import { moveGlossWord, glossWords } from './glossPlacement'

// Tom's own worked example, 2026-08-14. The audio says "the Spanish for 'blue
// thing' is: 'cosa azul'"; the TEXT that shows is two columns, cosa | azul over
// thing | blue. The displayed gloss is display-only and is not the known
// sentence — which is exactly why the tiles have to be free to move.
const cosaAzul = (): { span: number; known: string }[] => ([
  { span: 1, known: 'thing' },
  { span: 1, known: 'blue' },
])

describe('free placement of a known gloss tile', () => {
  it('puts a known tile under a different target column', () => {
    // "blue" belongs under `azul`; drop it under `cosa` instead.
    expect(moveGlossWord(cosaAzul(), { seg: 1, at: 0 }, { seg: 0, at: 0 })).toEqual([
      { span: 1, known: 'blue thing' },
      { span: 1, known: '' },
    ])
  })

  it('reaches a column that is not next door', () => {
    const segs = [
      { span: 1, known: 'I' }, { span: 1, known: 'want' },
      { span: 1, known: '' }, { span: 1, known: 'a word' },
    ]
    // 'I' travels from the first column to the last, past two others.
    expect(moveGlossWord(segs, { seg: 0, at: 0 }, { seg: 3, at: 2 })).toEqual([
      { span: 1, known: '' }, { span: 1, known: 'want' },
      { span: 1, known: '' }, { span: 1, known: 'a word I' },
    ])
  })

  it('reorders two known words inside one column', () => {
    expect(moveGlossWord([{ span: 2, known: 'a word' }], { seg: 0, at: 1 }, { seg: 0, at: 0 }))
      .toEqual([{ span: 2, known: 'word a' }])
  })

  it('leaves a column empty when its last word is taken away', () => {
    const out = moveGlossWord(cosaAzul(), { seg: 0, at: 0 }, { seg: 1, at: 1 })
    expect(out).toEqual([{ span: 1, known: '' }, { span: 1, known: 'blue thing' }])
  })

  it('stacks more than one known word under a single target column', () => {
    const segs = [{ span: 1, known: 'to' }, { span: 1, known: 'the' }, { span: 1, known: 'house' }]
    const once = moveGlossWord(segs, { seg: 0, at: 0 }, { seg: 1, at: 1 })!
    expect(once[1].known).toBe('the to')
    const twice = moveGlossWord(once, { seg: 2, at: 0 }, { seg: 1, at: 0 })!
    expect(twice).toEqual([
      { span: 1, known: '' }, { span: 1, known: 'house the to' }, { span: 1, known: '' },
    ])
  })

  // The half of Tom's sentence that is a hard NO: "but never the target words
  // of course."
  it('never changes a span, so no target column can move, merge or reorder', () => {
    const segs = [{ span: 2, known: 'a word' }, { span: 1, known: '' }, { span: 2, known: 'I want' }]
    const out = moveGlossWord(segs, { seg: 0, at: 0 }, { seg: 2, at: 0 })!
    expect(out.map(s => s.span)).toEqual([2, 1, 2])
  })

  it('keeps the gloss words as a multiset, so the API re-pairing gate passes', () => {
    const segs = [{ span: 1, known: 'I' }, { span: 2, known: 'want a word' }, { span: 1, known: '' }]
    const bag = (s: { known: string }[]) => s.flatMap(x => glossWords(x.known)).sort()
    for (const to of [{ seg: 0, at: 0 }, { seg: 1, at: 3 }, { seg: 2, at: 0 }]) {
      const out = moveGlossWord(segs, { seg: 1, at: 1 }, to)
      if (out) expect(bag(out)).toEqual(bag(segs))
    }
  })

  it('writes nothing for a tap that changes nothing', () => {
    // Dropped back exactly where it came from, either side of its own gap.
    expect(moveGlossWord(cosaAzul(), { seg: 0, at: 0 }, { seg: 0, at: 0 })).toBeNull()
    expect(moveGlossWord(cosaAzul(), { seg: 0, at: 0 }, { seg: 0, at: 1 })).toBeNull()
  })

  it('refuses a move that is not on the row', () => {
    expect(moveGlossWord(cosaAzul(), { seg: 9, at: 0 }, { seg: 0, at: 0 })).toBeNull()
    expect(moveGlossWord(cosaAzul(), { seg: 0, at: 3 }, { seg: 1, at: 0 })).toBeNull()
    expect(moveGlossWord(cosaAzul(), { seg: 0, at: 0 }, { seg: 9, at: 0 })).toBeNull()
    expect(moveGlossWord([], { seg: 0, at: 0 }, { seg: 0, at: 0 })).toBeNull()
  })

  it('clamps a landing slot past the end of a chunk rather than dropping the word', () => {
    const out = moveGlossWord(cosaAzul(), { seg: 0, at: 0 }, { seg: 1, at: 99 })!
    expect(out[1].known).toBe('blue thing')
  })
})
