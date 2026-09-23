/**
 * eng_for_hin his/her explanation (job #870·H, 2026-09-23) — the rule as a test.
 *
 * (1) "First" is measured from the LEGOs in course order, and an ambiguous first occurrence
 *     refuses rather than guesses. (2) The line obeys Kai's rails: Hindi only, no grammar
 *     terms, no brackets, quotes its chunk, ends in the course's ORDINARY bare introduction —
 *     Frame A, "अंग्रेज़ी में — 'X' — में :" — never the "as in" (जैसे) clause (Kai 2026-09-23, #877·H:
 *     "No need for the as in, it makes it needlessly long. But do follow the usual pattern of 'is: ...'").
 * (3) The mechanism holds it: with the mark, phase8's staleness door (pendingRowIsFresh) keeps
 *     a pending row carrying these words and drops a template row — the PRE-FIX state (no mark)
 *     is exactly what would let a course-wide re-author template-overwrite the line.
 * No DB, no network.
 */
import { describe, it, expect } from 'vitest'
import { createRequire } from 'node:module'
const requireCjs = createRequire(import.meta.url)
const t = requireCjs('./eng-for-hin-his-her-explanation-2026-09-23.cjs')
const ha = requireCjs('../../services/shared/human-authored-presentations.cjs')
const pa = requireCjs('../../services/phases/presentation-author.cjs')

// The live course on 2026-09-23 (the rows that matter, in their live order).
const LEGOS = [
  { lego_id: 'S0019L01', seed_number: 19, known_text: 'लेकिन', target_text: 'but', is_new: true },
  { lego_id: 'S0020L01', seed_number: 20, known_text: 'उसका नाम', target_text: 'his name', is_new: true },
  { lego_id: 'S0020L02', seed_number: 20, known_text: 'जल्दी', target_text: 'quickly', is_new: true },
  { lego_id: 'S0021L03', seed_number: 21, known_text: 'उसका नाम', target_text: 'her name', is_new: false },
  { lego_id: 'S0053L03', seed_number: 53, known_text: 'उसकी चिट्ठी', target_text: 'his letter', is_new: true },
]
const SEEDS = [
  { seed_number: 20, known_text: 'आप उसका नाम जल्दी सीखना चाहते हैं।', target_text: 'You want to learn his name quickly.', approved_at: '2026-09-10T15:16:46Z' },
  { seed_number: 21, known_text: 'आप उसका नाम क्यों सीख रहे हैं?', target_text: 'Why are you learning her name?', approved_at: '2026-09-10T15:32:19Z' },
]
const INTRO = t.planIntro('उसका नाम')

describe('where: the first his/her LEGO, measured', () => {
  it('finds his at seed 20 and her at seed 21, the same Hindi chunk', () => {
    const f = t.firstHisHer(LEGOS)
    expect(f.his.lego_id).toBe('S0020L01')
    expect(f.her.lego_id).toBe('S0021L03')
    expect(f.either.lego_id).toBe('S0020L01')
    expect(f.her.known_text).toBe(f.his.known_text)
  })
  it('refuses when the first occurrence is not a presentation of its own (not is_new)', () => {
    const legos = LEGOS.map((l) => (l.lego_id === 'S0020L01' ? { ...l, is_new: false } : l))
    expect(() => t.planLine({ legos, seeds: SEEDS })).toThrow(/not is_new/)
  })
  it('refuses when the first his/her is an object, not a possessive ("I told her")', () => {
    const legos = [{ lego_id: 'S0010L01', seed_number: 10, known_text: 'मैंने उसे बताया', target_text: 'I told her', is_new: true }, ...LEGOS]
    expect(() => t.planLine({ legos, seeds: SEEDS })).toThrow(/not a possessive/)
  })
})

describe("what: Kai's rails on the line", () => {
  const plan = t.planLine({ legos: LEGOS, seeds: SEEDS })
  it("ends in the course's ordinary bare intro, matching the live Frame A rows byte for byte", () => {
    // Live eng_for_hin rows (2026-09-23), e.g. S0023L01: "अंग्रेज़ी में — 'जल्द ही' — में :"
    expect(INTRO).toBe("अंग्रेज़ी में — 'उसका नाम' — में :")
    expect(INTRO).toBe(pa.renderIntro({ frame: 'A', template: t.HINDI_TEMPLATE, targetLangName: 'अंग्रेज़ी', chunk: 'उसका नाम', seed: SEEDS[0].known_text }))
    expect(plan.text).not.toMatch(/जैसे/)
    expect(plan.text.endsWith(INTRO)).toBe(true)
  })
  it('is Hindi only, no grammar terms, no brackets, quotes the chunk, ends in the intro', () => {
    expect(t.lineProblems(plan.text, { chunk: 'उसका नाम' })).toEqual([])
    expect(plan.text.startsWith(t.EXPLANATION)).toBe(true)
    expect(plan.same_chunk_elsewhere).toEqual(['S0021L03 → her name (not new)'])
  })
  it('the rails catch what they are for', () => {
    const p = (s) => t.lineProblems(s, { chunk: 'उसका नाम' })
    expect(p(`his और her। ${INTRO}`)).toContainEqual(expect.stringMatching(/Latin/))
    expect(p(`यह सर्वनाम है। ${INTRO}`)).toContainEqual(expect.stringMatching(/grammar term/))
    expect(p(`${t.EXPLANATION} अंग्रेज़ी में — 'उसका नाम' — जैसे — '${SEEDS[0].known_text}' — में :`)).toContainEqual(expect.stringMatching(/as in/))
  })
})

describe('how: the human-authored mark is what keeps the words', () => {
  const plan = t.planLine({ legos: LEGOS, seeds: SEEDS })
  const templateRow = { s3_key: 'pending/T.mp3', text: INTRO, lego_id: 'S0020L01' }
  const lineRow = { s3_key: 'pending/L.mp3', text: plan.text, lego_id: 'S0020L01' }
  it('with the mark, the line row is fresh and the bare template row is stale', () => {
    const mark = { course_code: 'eng_for_hin', lego_id: 'S0020L01', text: plan.text }
    expect(ha.pendingRowIsFresh(lineRow, mark)).toBe(true)
    expect(ha.pendingRowIsFresh(templateRow, mark)).toBe(false)
  })
  it('the guard compares words, not bytes — spacing does not unmark the line', () => {
    const mark = { text: plan.text.replace(/\s+/g, '  ') }
    expect(ha.pendingRowIsFresh(lineRow, mark)).toBe(true)
  })
})
