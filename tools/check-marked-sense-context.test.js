// Unit tests for the K23(d) marked-sense-context detector.
// Run: npx vitest run tools/check-marked-sense-context.test.js
//
// The first block is the one that matters. It is the BEFORE/AFTER of the eleven
// ita_for_eng conoscere USE phrases re-authored on 2026-09-10 (Kai's ruling, 11:18Z):
// every BEFORE text must be flagged and every AFTER text must be clear. Run the
// BEFORE column against a detector that does not implement K23(d) and it fails; that
// is the difference between a fix that is proven and one that is believed.
import { describe, it, expect } from 'vitest'
import { classifyPrompt, NEVER_A_CUE } from './marked-sense/detect.cjs'

// [id, BEFORE known side, AFTER known side] — verbatim, from the live database.
const THE_ELEVEN = [
  ['S0085L01U03', "I don't know the answer",                                    "I don't know other people who speak Italian"],
  ['S0085L01U06', "I don't know the answer now",                                "I don't know enough people yet"],
  ['S0105L02U01', 'he didn\'t know the answer',                                 "he didn't know my friends"],
  ['S0105L02U04', "he didn't know the way to do this",                          "he didn't know my friend's story"],
  ['S0290L01U04', 'he knows the answer',                                        'he knows my friend'],
  ['S0472L02U04', 'do you know the facts?',                                     'do you know the man who wants to find the facts?'],
  ['S0472L03U01', "part of the problem is that we don't know the facts",        "part of the problem is that we don't know many people here"],
  ['S0474L01U03', "she doesn't even know the facts",                            "she doesn't even know my sister"],
  ['S0475L02U02', "she doesn't know the reasons",                               'she doesn\'t know the woman who told her the reasons'],
  ['S0475L01U02', "there are many things we don't know",                        "there are many people we don't know"],
  ['S0484L01U03', "it's meant to be something we know",                         'it\'s meant to be easy for the people we know'],
]

describe('the eleven ita_for_eng conoscere USE phrases (2026-09-10)', () => {
  for (const [id, before, after] of THE_ELEVEN) {
    it(`${id}: the old prompt is flagged and the new one is clear`, () => {
      expect(classifyPrompt(before).flagged, `BEFORE should flag: "${before}"`).toBe(true)
      expect(classifyPrompt(after).flagged, `AFTER should be clear: "${after}"`).toBe(false)
    })
  }
})

// The worked false positive. The canon asks for these to be recorded rather than
// re-litigated, and a detector with a known, read, accepted false positive is more
// honest than one tuned until its output looks clean.
describe('known accepted false positive', () => {
  it('S0145L01U04 "I don\'t know her any more" flags, and a reader clears it', () => {
    // "her" is the person known, so this prompt is correct as it stands. It is not
    // in the cue list because as a POSSESSIVE it would clear "I don't know her
    // answer" — exactly the shape K23(d) exists to catch. One flag a reader clears
    // in five seconds is the right trade against a silent miss.
    expect(classifyPrompt("I don't know her any more").flagged).toBe(true)
    expect(classifyPrompt("I don't know her answer").flagged).toBe(true)
  })
})

describe('what counts as context', () => {
  it('a generic pro-form is never a cue — that is the defect, not the cure', () => {
    for (const w of ['something', 'things', 'anything', 'the answer', 'the facts', 'the reasons'])
      expect(classifyPrompt(`we don't know ${w}`).flagged).toBe(true)
    expect(NEVER_A_CUE.has('something')).toBe(true)
  })

  it('a person, a place or an acquaintable thing clears the prompt', () => {
    expect(classifyPrompt('I know that woman').cues).toContain('woman')
    expect(classifyPrompt('do you know the path through the wood well?').cues).toContain('path')
    expect(classifyPrompt("I don't know his name").cues).toContain('name')
  })

  it("a possessive 's does not hide the cue", () => {
    expect(classifyPrompt("he didn't know my friend's story").flagged).toBe(false)
  })

  it('absence of a cue flags rather than passes — the asymmetry is deliberate', () => {
    expect(classifyPrompt('').flagged).toBe(true)
    expect(classifyPrompt('he knows').flagged).toBe(true)
  })
})
