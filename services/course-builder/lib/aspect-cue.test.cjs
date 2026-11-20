/**
 * Aspect-cue determinism check — WARN-ONLY (the blocking 了 gate is deferred by BSC).
 * Proves the zho_for_eng contract's cue-table is read: didn't → 没 never 了,
 * have…ever → 过; multi-clause targets are skipped and counted, never judged;
 * a contract with no cues returns nothing.
 *
 * Run: npx vitest run services/course-builder/lib/aspect-cue
 */
import { describe, it, expect } from 'vitest'

const { checkAspectCues } = require('./validation.cjs')
const zho = require('../../../docs/pair-contracts/zho_for_eng.contract.cjs')

describe('checkAspectCues (zho_for_eng contract)', () => {
  it("flags didn't rendered with 了 or without 没", () => {
    const { warnings, checked } = checkAspectCues([
      { known: "I didn't eat", target: '我没吃了' },
      { known: "I didn't go", target: '我不去' },
      { known: "I didn't eat", target: '我没吃' },
    ], zho)
    expect(checked).toBe(3)
    expect(warnings.map(w => [w.target, w.cue])).toEqual([
      ['我没吃了', 'didnt-mei-not-le'],
      ['我不去', 'didnt-mei-not-le'],
    ])
    expect(warnings[0].present).toEqual(['了'])
    expect(warnings[1].missing).toEqual(['没'])
  })

  it('flags have…ever without 过', () => {
    const { warnings } = checkAspectCues([
      { known: 'have you ever been to China', target: '你去中国吗' },
      { known: 'have you ever been to China', target: '你去过中国吗' },
    ], zho)
    expect(warnings).toHaveLength(1)
    expect(warnings[0].cue).toBe('have-ever-guo')
  })

  it('skips and counts multi-clause targets; ignores unmatched knowns', () => {
    const r = checkAspectCues([
      { known: "he didn't come so I left", target: '他没来，所以我走了' },
      { known: 'I ate', target: '我吃了' },
    ], zho)
    expect(r).toEqual({ warnings: [], checked: 0, skipped: 1 })
  })

  it('a contract without aspectCues returns nothing', () => {
    expect(checkAspectCues([{ known: "I didn't", target: '了' }], { course_code: 'x' }))
      .toEqual({ warnings: [], checked: 0, skipped: 0 })
  })
})
