/**
 * The diff has one job: show WHICH WORDS changed in a line someone is about to
 * record. The load-bearing assertions are that an unchanged line produces no
 * change runs at all (a diff that cries wolf is a diff nobody reads), that
 * punctuation counts as part of the word ("yes." and "yes!" are different
 * performances), and that reassembling the runs gives back both texts exactly —
 * if the join is lossy, the reader is looking at words that are not in the line.
 */
import { describe, it, expect } from 'vitest'
import { wordDiff, tokenise, textChanged } from './wordDiff.js'

const join = (runs, kinds) => runs.filter(r => kinds.includes(r.kind)).map(r => r.text).join('')

describe('wordDiff', () => {
  it('reports nothing changed when nothing changed', () => {
    const runs = wordDiff('So what do you want to say?', 'So what do you want to say?')
    expect(runs.every(r => r.kind === 'same')).toBe(true)
    expect(textChanged('So what do you want to say?', 'So what do you want to say?')).toBe(false)
  })

  it('marks the substituted words and leaves the rest alone', () => {
    const runs = wordDiff('So what do you want to say?', 'So what would you like to say?')
    expect(join(runs, ['del'])).toBe('do want ')
    expect(join(runs, ['add'])).toBe('would like ')
    expect(join(runs, ['same', 'add']).trim()).toBe('So what would you like to say?')
  })

  it('reassembles the new text exactly, and the old one up to whitespace', () => {
    // Matched words carry the NEW text's spacing, because the stream on screen
    // is what the line is about to become. So the after-side is byte-exact and
    // the before-side is exact in its words — which is what a diff of a line is
    // for. If either side lost a WORD, the reader would be looking at a line
    // that does not exist.
    const before = 'Right,  so  — you say it.'
    const after = 'Right, so you say it now.'
    const runs = wordDiff(before, after)
    expect(join(runs, ['same', 'add'])).toBe(after)
    expect(join(runs, ['same', 'del']).split(/\s+/)).toEqual(before.split(/\s+/))
  })

  it('treats punctuation as part of the word', () => {
    const runs = wordDiff('yes.', 'yes!')
    expect(runs.map(r => r.kind)).toEqual(['del', 'add'])
    expect(textChanged('yes.', 'yes!')).toBe(true)
  })

  it('does not report a re-wrapped line as a rewrite', () => {
    expect(textChanged('one two three', 'one  two\nthree ')).toBe(false)
    expect(wordDiff('one two three', 'one  two\nthree ').every(r => r.kind === 'same')).toBe(true)
  })

  it('handles a pure insertion and a pure deletion', () => {
    expect(join(wordDiff('', 'brand new line'), ['add'])).toBe('brand new line')
    expect(join(wordDiff('gone entirely', ''), ['del'])).toBe('gone entirely')
    expect(wordDiff('', '').length).toBe(0)
  })

  it('merges adjacent runs of the same kind so the render is readable', () => {
    const runs = wordDiff('a b c d', 'a x y d')
    expect(runs.map(r => r.kind)).toEqual(['same', 'del', 'add', 'same'])
  })

  it('tokenises words with their trailing whitespace', () => {
    expect(tokenise('a  b\nc')).toEqual(['a  ', 'b\n', 'c'])
    expect(tokenise(null)).toEqual([])
  })
})
